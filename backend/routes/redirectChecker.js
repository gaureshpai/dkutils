const router = require("express").Router();
const axios = require("axios");
const dns = require("node:dns").promises;
const { isIP } = require("node:net");

const PRIVATE_IP_RANGES = [
	{ start: "10.0.0.0", end: "10.255.255.255" },
	{ start: "172.16.0.0", end: "172.31.255.255" },
	{ start: "192.168.0.0", end: "192.168.255.255" },
];

const MAX_REDIRECTS = 10;
const TIMEOUT_MS = 5000;

function isPrivateIP(ip) {
	if (isIP(ip) === 4) {
		const parts = ip.split(".").map(Number);
		const num = parts[0] * 16777216 + parts[1] * 65536 + parts[2] * 256 + parts[3];

		for (const range of PRIVATE_IP_RANGES) {
			const startParts = range.start.split(".").map(Number);
			const endParts = range.end.split(".").map(Number);
			const startNum =
				startParts[0] * 16777216 + startParts[1] * 65536 + startParts[2] * 256 + startParts[3];
			const endNum = endParts[0] * 16777216 + endParts[1] * 65536 + endParts[2] * 256 + endParts[3];

			if (num >= startNum && num <= endNum) {
				return true;
			}
		}
	}
	return false;
}

function isLinkLocal(ip) {
	if (isIP(ip) === 4) {
		const parts = ip.split(".").map(Number);
		return parts[0] === 169 && parts[1] === 254;
	}
	return false;
}

function isLoopback(ip) {
	if (isIP(ip) === 4) {
		return ip.startsWith("127.");
	}
	return ip === "::1";
}

function isMulticast(ip) {
	if (isIP(ip) === 4) {
		const parts = ip.split(".").map(Number);
		return parts[0] >= 224 && parts[0] <= 239;
	}
	return ip.startsWith("ff");
}

async function checkIPSafety(hostname) {
	if (isIP(hostname)) {
		const ip = hostname;
		if (isPrivateIP(ip) || isLinkLocal(ip) || isLoopback(ip) || isMulticast(ip)) {
			throw new Error(`Rejected unsafe IP address: ${ip}`);
		}
		return;
	}

	try {
		const addresses = await dns.resolve4(hostname);
		for (const ip of addresses) {
			if (isPrivateIP(ip) || isLinkLocal(ip) || isLoopback(ip) || isMulticast(ip)) {
				throw new Error(`Rejected unsafe IP address: ${ip} (resolved from ${hostname})`);
			}
		}
	} catch (err) {
		if (err.message.includes("Rejected")) {
			throw err;
		}
		try {
			const addresses6 = await dns.resolve6(hostname);
			for (const ip of addresses6) {
				if (isPrivateIP(ip) || isLoopback(ip) || isMulticast(ip)) {
					throw new Error(`Rejected unsafe IPv6 address: ${ip} (resolved from ${hostname})`);
				}
			}
		} catch {
			// Ignore resolution errors, let axios try anyway
		}
	}
}

async function validateUrl(targetUrl) {
	const parsed = new URL(targetUrl);

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error(`Invalid scheme: ${parsed.protocol}. Only http and https are allowed.`);
	}

	await checkIPSafety(parsed.hostname);
}

async function validateRedirectLocation(location, baseUrl) {
	let resolvedUrl;
	if (!location.startsWith("http")) {
		const base = new URL(baseUrl);
		resolvedUrl = new URL(location, base.origin + base.pathname);
	} else {
		resolvedUrl = new URL(location);
	}

	await validateUrl(resolvedUrl.href);
	return resolvedUrl.href;
}

// @route   POST /api/redirect-checker
// @desc    Check URL redirects and return the redirect chain
// @access  Public
router.post("/", async (req, res) => {
	const { url } = req.body;

	if (!url) {
		return res.status(400).json({ msg: "URL is required" });
	}

	try {
		await validateUrl(url);
	} catch (err) {
		return res.status(400).json({ msg: err.message });
	}

	const redirectChain = [];
	let currentUrl = url;

	try {
		for (let i = 0; i < MAX_REDIRECTS; i += 1) {
			try {
				const response = await axios.head(currentUrl, {
					maxRedirects: 0,
					validateStatus: (status) => status >= 200 && status < 400,
					timeout: TIMEOUT_MS,
					maxContentLength: 1024 * 1024,
				});

				redirectChain.push({ url: currentUrl, status: response.status });

				if (response.status >= 300 && response.status < 400 && response.headers.location) {
					try {
						currentUrl = await validateRedirectLocation(response.headers.location, currentUrl);
					} catch (err) {
						return res.status(400).json({ msg: `Redirect blocked: ${err.message}` });
					}
				} else {
					break;
				}
			} catch (err) {
				break;
			}
		}

		if (redirectChain.length === 0 || redirectChain[redirectChain.length - 1].url !== currentUrl) {
			const finalResponse = await axios.get(currentUrl, {
				timeout: TIMEOUT_MS,
				maxContentLength: 1024 * 1024,
			});
			redirectChain.push({
				url: finalResponse.request.res.responseUrl,
				status: finalResponse.status,
			});
		}

		return res.status(200).json({ chain: redirectChain });
	} catch (err) {
		console.error("Error checking redirects:", err);
		let errorMessage = "Failed to check redirects.";
		if (err.response) {
			errorMessage = `Request failed with status code ${err.response.status}.`;
			if (err.response.headers.location) {
				errorMessage += ` Redirected to: ${err.response.headers.location}`;
			}
		} else if (err.request) {
			errorMessage = "No response received from the server.";
		} else {
			errorMessage = err.message;
		}
		return res.status(500).json({ msg: errorMessage });
	}
});

module.exports = router;
