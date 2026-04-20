const router = require("express").Router();
const axios = require("axios");
const http = require("node:http");
const https = require("node:https");
const dns = require("node:dns");
const { isPrivateIP } = require("@backend/utils/ipValidation");

// Function to validate domain and resolve to check for private IPs
const validateDomain = async (domain) => {
	try {
		// Basic domain format validation
		const domainRegex =
			/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
		if (!domainRegex.test(domain)) {
			throw new Error("Invalid domain format");
		}

		// Resolve DNS to check IP addresses (dual-stack support)
		const addresses = await dns.promises.lookup(domain, {
			all: true,
			verbatim: true,
		});
		if (addresses.length === 0) {
			throw new Error("DNS resolution failed");
		}

		// Check if any resolved IP is private
		for (const { address: ip } of addresses) {
			if (isPrivateIP(ip)) {
				throw new Error("Private IP ranges not allowed");
			}
		}

		return addresses;
	} catch (error) {
		throw new Error(`Domain validation failed: ${error.message}`);
	}
};

/**
 * Fetches the content of a URL and checks if the content exists.
 * It uses a custom DNS lookup function to pin the resolution of the hostname to the validated IP addresses.
 * @param {string} url - The URL to fetch.
 * @param {Array<{address: string, family: number}>} validatedAddresses - Validated DNS records for the hostname.
 * @returns {Promise<{content: string, exists: boolean, error?: string, redirectStatus?: number}>} A promise that resolves to an object containing the fetched content, whether the content exists, and an optional error string and redirect status.
 */
const fetchContent = async (url, validatedAddresses) => {
	try {
		const parsedUrl = new URL(url);
		/**
		 * Custom DNS lookup function that pins the resolution of the hostname to the validated IP addresses.
		 * If the request hostname does not equal the target hostname, the function falls back to the normal DNS lookup.
		 * If the request hostname equals the target hostname, the function returns the validated IP address(es) that match the requested family (or all addresses if no family is specified).
		 * @param {string} hostname - The hostname being resolved.
		 * @param {Object|number} options - Options for the DNS lookup (family and all).
		 * @param {Function} callback - The callback function to receive the DNS lookup result.
		 */
		const pinnedLookup = (hostname, options, callback) => {
			if (hostname !== parsedUrl.hostname) {
				// Validate the redirect target before resolving - use a single lookup to prevent TOCTOU
				dns.lookup(hostname, { all: true }, (err, addrs) => {
					if (err) return callback(err);
					for (const { address } of addrs) {
						if (isPrivateIP(address)) {
							return callback(new Error(`Rejected unsafe redirect to ${address}`));
						}
					}
					// All addresses validated - now return the appropriate result from the already-validated records
					const family = typeof options === "number" ? options : options?.family;
					const returnAll = typeof options === "object" && options?.all === true;

					if (returnAll) {
						const filtered = family ? addrs.filter((entry) => entry.family === family) : addrs;
						if (filtered.length === 0) {
							return callback(new Error("No validated DNS records available"));
						}
						return callback(null, filtered);
					}

					const candidate = addrs.find((entry) => !family || entry.family === family) ?? addrs[0];
					if (!candidate) {
						return callback(new Error("No validated DNS records available"));
					}
					return callback(null, candidate.address, candidate.family);
				});
				return;
			}

			// Handle options.all === true case
			if (options && options.all === true) {
				const family = options?.family;
				const mappedArray = family
					? validatedAddresses.filter((entry) => entry.family === family)
					: validatedAddresses;

				if (mappedArray.length === 0) {
					return callback(new Error("No validated DNS records available"));
				}

				return callback(null, mappedArray);
			}

			const family = typeof options === "number" ? options : options?.family;
			const candidate =
				validatedAddresses.find((entry) => !family || entry.family === family) ??
				validatedAddresses[0];

			if (!candidate) {
				return callback(new Error("No validated DNS records available"));
			}

			return callback(null, candidate.address, candidate.family);
		};

		const response = await axios.get(url, {
			timeout: 5000,
			maxRedirects: 5, // Allow a small number of redirects
			maxContentLength: 50 * 1024 * 1024, // 50 MB limit
			maxBodyLength: 50 * 1024 * 1024, // 50 MB limit
			validateStatus: (status) => status >= 200 && status < 300, // Only accept 2xx status codes
			httpAgent: new http.Agent({ lookup: pinnedLookup }),
			httpsAgent: new https.Agent({
				lookup: pinnedLookup,
			}),
		});
		return { content: response.data, exists: true };
	} catch (error) {
		if (axios.isAxiosError(error)) {
			if (error.response?.status === 404) {
				return { content: "", exists: false, error: "File not found (404)" };
			}
			if (error.code === "ERR_FR_TOO_MANY_REDIRECTS") {
				return { content: "", exists: false, error: "too_many_redirects" };
			}
		}
		// Log full error server-side for diagnostics
		console.error("fetchContent error:", error.message);

		// Map unsafe redirect errors to generic label
		if (error.message?.startsWith("Rejected unsafe redirect")) {
			return { content: "", exists: false, error: "redirect_blocked" };
		}
		return { content: "", exists: false, error: error.message };
	}
};

/**
 * Factory function to create SEO fetch handlers for robots.txt and sitemap.xml.
 * Normalizes incoming URLs, validates domains, and fetches content.
 * @param {string} pathSuffix - The path to append to the base URL (e.g., "/robots.txt", "/sitemap.xml")
 * @param {string} label - Human-readable label for the resource (e.g., "robots.txt", "sitemap.xml")
 * @returns {Function} Express route handler function
 */
const handleSeoFetch = (pathSuffix, label) => async (req, res) => {
	const rawUrl = req.query.url || req.body.domain;

	if (!rawUrl) {
		return res.status(400).json({ msg: "URL is required" });
	}

	// Ensure rawUrl is a string, reject arrays or non-primitive types
	if (typeof rawUrl !== "string") {
		return res.status(400).json({ msg: "URL must be a single string value" });
	}

	try {
		// Normalize URL by prepending https:// if no scheme is present
		let normalizedUrl = rawUrl.trim();
		if (!/^https?:\/\//i.test(normalizedUrl)) {
			normalizedUrl = `https://${normalizedUrl}`;
		}

		// Attempt to construct the target URL
		let targetUrl;
		try {
			targetUrl = new URL(pathSuffix, normalizedUrl);
		} catch (parseError) {
			return res.status(400).json({ msg: `Invalid URL format: ${parseError.message}` });
		}

		// Validate the domain
		let validatedAddresses;
		try {
			validatedAddresses = await validateDomain(targetUrl.hostname);
		} catch (validationError) {
			console.error("Domain validation error:", validationError);
			return res.status(400).json({ msg: "Invalid domain" });
		}

		// Fetch content
		let servedUrl = targetUrl.href;
		let result = await fetchContent(servedUrl, validatedAddresses);

		// If HTTPS fails only due to a missing resource, try HTTP fallback
		if (
			!result.exists &&
			(result.error === "File not found (404)" || result.error === "too_many_redirects")
		) {
			targetUrl.protocol = "http:";
			servedUrl = targetUrl.href;
			result = await fetchContent(servedUrl, validatedAddresses);
		}

		if (result.exists) {
			return res.json({
				exists: true,
				content: result.content,
				url: servedUrl,
			});
		}

		return res.status(404).json({
			msg: result.error || `${label} not found`,
			error: result.error || `${label} not found`,
			exists: false,
		});
	} catch (err) {
		// Sanitized error logging
		const sanitizedError = {
			message: err.message,
			code: err.code,
			status: err.response?.status,
		};
		console.error(`Error fetching ${label}:`, sanitizedError);

		// Return appropriate error response
		if (err.message?.startsWith("Domain validation failed")) {
			return res.status(400).json({ msg: err.message });
		}
		return res.status(500).json({ msg: "Server Error" });
	}
};

// @route   GET /api/seo/robots-txt
// @desc    Fetch and validate robots.txt from a domain
// @access  Public
router.get("/robots-txt", handleSeoFetch("/robots.txt", "robots.txt"));

// @route   POST /api/seo/robots-txt
// @desc    Fetch and validate robots.txt from a domain (backward compatibility)
// @access  Public
router.post("/robots-txt", handleSeoFetch("/robots.txt", "robots.txt"));

// @route   GET /api/seo/sitemap-xml
// @desc    Fetch and validate sitemap.xml from a domain
// @access  Public
router.get("/sitemap-xml", handleSeoFetch("/sitemap.xml", "sitemap.xml"));

// @route   POST /api/seo/sitemap-xml
// @desc    Fetch and validate sitemap.xml from a domain (backward compatibility)
// @access  Public
router.post("/sitemap-xml", handleSeoFetch("/sitemap.xml", "sitemap.xml"));

module.exports = router;
