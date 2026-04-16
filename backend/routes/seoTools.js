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

const fetchContent = async (url, validatedAddresses) => {
	try {
		const parsedUrl = new URL(url);
		const pinnedLookup = (hostname, options, callback) => {
			if (hostname !== parsedUrl.hostname) {
				return dns.lookup(hostname, options, callback);
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
			maxRedirects: 0, // Disable redirects to prevent SSRF chains
			validateStatus: (status) => status >= 200 && status < 300, // Only accept 2xx status codes
			httpAgent: new http.Agent({ lookup: pinnedLookup }),
			httpsAgent: new https.Agent({
				lookup: pinnedLookup,
				servername: parsedUrl.hostname,
			}),
		});
		return { content: response.data, exists: true };
	} catch (error) {
		if (axios.isAxiosError(error)) {
			if (error.response?.status === 404) {
				return { content: "", exists: false, error: "File not found (404)" };
			}
			if ([301, 302, 307, 308].includes(error.response?.status)) {
				return {
					content: "",
					exists: false,
					error: "redirect",
					redirectStatus: error.response.status,
				};
			}
			if (error.code === "ERR_FR_TOO_MANY_REDIRECTS") {
				return { content: "", exists: false, error: "too_many_redirects" };
			}
		}
		return { content: "", exists: false, error: error.message };
	}
};

// @route   GET /api/seo/robots-txt
// @desc    Fetch and validate robots.txt from a domain
// @access  Public
router.get("/robots-txt", async (req, res) => {
	const { url } = req.query;

	if (!url) {
		return res.status(400).json({ msg: "URL is required" });
	}

	try {
		const robotsUrl = new URL("/robots.txt", url);

		let validatedAddresses;
		try {
			const validation = await validateDomain(robotsUrl.hostname);
			validatedAddresses = validation;
		} catch (validationError) {
			return res.status(400).json({ msg: validationError.message });
		}

		let result = await fetchContent(robotsUrl.href, validatedAddresses);

		if (!result.exists) {
			// Try HTTP if HTTPS fails
			const httpUrl = robotsUrl.href.replace(/^https:/, "http:");
			result = await fetchContent(httpUrl, validatedAddresses);
		}

		if (result.exists) {
			return res.json({
				content: result.content,
				url: robotsUrl.href,
			});
		}

		return res.status(404).json({ msg: result.error || "robots.txt not found" });
	} catch (err) {
		console.error("Error fetching robots.txt:", err);
		return res.status(500).json({ msg: "Server Error" });
	}
});

// @route   GET /api/seo/sitemap-xml
// @desc    Fetch and validate sitemap.xml from a domain
// @access  Public
router.get("/sitemap-xml", async (req, res) => {
	const { url } = req.query;

	if (!url) {
		return res.status(400).json({ msg: "URL is required" });
	}

	try {
		const sitemapUrl = new URL("/sitemap.xml", url);

		let validatedAddresses;
		try {
			const validation = await validateDomain(sitemapUrl.hostname);
			validatedAddresses = validation;
		} catch (validationError) {
			return res.status(400).json({ msg: validationError.message });
		}

		let result = await fetchContent(sitemapUrl.href, validatedAddresses);

		if (!result.exists) {
			// Try HTTP if HTTPS fails
			const httpUrl = sitemapUrl.href.replace(/^https:/, "http:");
			result = await fetchContent(httpUrl, validatedAddresses);
		}

		if (result.exists) {
			return res.json({
				content: result.content,
				url: sitemapUrl.href,
			});
		}

		return res.status(404).json({ msg: result.error || "sitemap.xml not found" });
	} catch (err) {
		console.error("Error fetching sitemap.xml:", err);
		return res.status(500).json({ msg: "Server Error" });
	}
});

module.exports = router;
