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
		const addresses = await dns.promises.lookup(domain, { all: true, verbatim: true });
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
		if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
			return { content: "", exists: false, error: "File not found (404)" };
		}
		if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
			return { content: "", exists: false, error: "Request timed out" };
		}
		console.error(`Error fetching ${url}:`, error.message);
		return {
			content: "",
			exists: false,
			error: `Failed to fetch: ${error.message}`,
		};
	}
};

// @route   POST /api/seo/robots-txt
// @desc    Fetch and return robots.txt content for a given domain
// @access  Public
router.post("/robots-txt", async (req, res) => {
	const { domain } = req.body;

	if (!domain) {
		return res.status(400).json({ msg: "Domain is required." });
	}

	try {
		const validatedAddresses = await validateDomain(domain);
		const url = `http://${domain}/robots.txt`;
		const httpsUrl = `https://${domain}/robots.txt`;
		let result = await fetchContent(httpsUrl, validatedAddresses);
		if (
			!result.exists &&
			(result.error === "File not found (404)" ||
				result.error?.includes("redirect") ||
				result.error?.includes("302") ||
				result.error?.includes("301"))
		) {
			result = await fetchContent(url, validatedAddresses);
		}
		return res.status(200).json(result);
	} catch (error) {
		return res.status(400).json({ msg: error.message });
	}
});

// @route   POST /api/seo/sitemap-xml
// @desc    Fetch and return sitemap.xml content for a given domain
// @access  Public
router.post("/sitemap-xml", async (req, res) => {
	const { domain } = req.body;

	if (!domain) {
		return res.status(400).json({ msg: "Domain is required." });
	}

	try {
		const validatedAddresses = await validateDomain(domain);
		const url = `http://${domain}/sitemap.xml`;
		const httpsUrl = `https://${domain}/sitemap.xml`;
		let result = await fetchContent(httpsUrl, validatedAddresses);
		if (
			!result.exists &&
			(result.error === "File not found (404)" ||
				result.error?.includes("redirect") ||
				result.error?.includes("302") ||
				result.error?.includes("301"))
		) {
			result = await fetchContent(url, validatedAddresses);
		}
		return res.status(200).json(result);
	} catch (error) {
		return res.status(400).json({ msg: error.message });
	}
});

module.exports = router;
