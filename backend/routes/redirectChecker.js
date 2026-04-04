const router = require("express").Router();
const axios = require("axios");
const dns = require("node:dns").promises;
const { isIP } = require("node:net");
const { isPrivateIP: isPrivateIPShared } = require("@backend/utils/ipValidation");

const PRIVATE_IP_RANGES = [
	{ start: "10.0.0.0", end: "10.255.255.255" },
	{ start: "172.16.0.0", end: "172.31.255.255" },
	{ start: "192.168.0.0", end: "192.168.255.255" },
];

const MAX_REDIRECTS = 10;
const TIMEOUT_MS = 5000;

/**
 * Determine whether an IP address is within known private or local address ranges.
 *
 * Recognizes IPv4 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), IPv6
 * unique local addresses (fc00::/7), and IPv4-mapped IPv6 addresses.
 *
 * @param {string} ip - The IP address or IP literal to test (IPv4 or IPv6).
 * @returns {boolean} `true` if the address is private/local, `false` otherwise.
 */
function isPrivateIP(ip) {
	let normalizedIp = ip;

	if (isIP(normalizedIp) === 6) {
		const normalized = normalizedIp.toLowerCase();
		if (normalized.startsWith("::ffff:")) {
			normalizedIp = normalizedIp.substring(7);
		}
	}

	// Use shared validator which covers both IPv4 and IPv6 private ranges
	if (isPrivateIPShared(normalizedIp)) {
		return true;
	}

	// Additional IPv4 private range checks for backward compatibility
	if (isIP(normalizedIp) === 4) {
		const parts = normalizedIp.split(".").map(Number);
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

	// Check for IPv6 ULA (fc00::/7 - covers both fc00::/8 and fd00::/8)
	if (isIP(normalizedIp) === 6) {
		const normalized = normalizedIp.toLowerCase();
		if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
			return true;
		}
	}

	return false;
}

/**
 * Determines whether the given IP address is link-local.
 *
 * IPv4 link-local range: 169.254.0.0/16. IPv6 link-local prefix: fe80::/10.
 * @param {string} ip - IP address string.
 * @returns {boolean} `true` if the address is link-local, `false` otherwise.
 */
function isLinkLocal(ip) {
	let normalizedIp = ip;
	if (isIP(normalizedIp) === 6 && normalizedIp.toLowerCase().startsWith("::ffff:")) {
		normalizedIp = normalizedIp.substring(7);
	}
	if (isIP(normalizedIp) === 4) {
		const parts = normalizedIp.split(".").map(Number);
		return parts[0] === 169 && parts[1] === 254;
	}
	if (isIP(normalizedIp) === 6) {
		const firstHextet = normalizedIp.toLowerCase().split(":")[0];
		const value = Number.parseInt(firstHextet, 16);
		return !Number.isNaN(value) && value >= 0xfe80 && value <= 0xfebf;
	}
	return false;
}

/**
 * Determines whether an IP address is a loopback address.
 * IPv4: 127.0.0.0/8
 * IPv6: ::1 and IPv4-mapped loopback (::ffff:127.0.0.0/8)
 * @param {string} ip - The IP address to check.
 * @returns {boolean} `true` if the address is a loopback address, `false` otherwise.
 */
function isLoopback(ip) {
	if (isIP(ip) === 4) {
		return ip.startsWith("127.");
	}
	if (isIP(ip) === 6) {
		const normalized = ip.toLowerCase();
		if (normalized === "::1") {
			return true;
		}
		// Check for IPv4-mapped IPv6 loopback (::ffff:127.x.x.x)
		if (normalized.startsWith("::ffff:127.")) {
			return true;
		}
	}
	return false;
}

/**
 * Determine whether an IP literal is a multicast address.
 * @param {string} ip - IPv4 dotted-quad or IPv6 literal; IPv4-mapped IPv6 (starting with `::ffff:`) is treated as the underlying IPv4 address.
 * @returns {boolean} `true` if the address is multicast (IPv4: `224.0.0.0/4`; IPv6: `ff00::/8`), `false` otherwise.
 */
function isMulticast(ip) {
	let normalizedIp = ip;
	if (isIP(normalizedIp) === 6 && normalizedIp.toLowerCase().startsWith("::ffff:")) {
		normalizedIp = normalizedIp.substring(7);
	}
	if (isIP(normalizedIp) === 4) {
		const parts = normalizedIp.split(".").map(Number);
		return parts[0] >= 224 && parts[0] <= 239;
	}
	if (isIP(normalizedIp) === 6) {
		const normalized = normalizedIp.toLowerCase();
		return normalized.startsWith("ff");
	}
	return false;
}

/**
 * Rejects hostnames or IP literals that are or resolve to unsafe network addresses.
 *
 * If given an IP literal, throws when it is private, link-local, loopback, or multicast.
 * If given a hostname, resolves all A/AAAA records and throws when any resolved address is private, link-local, loopback, or multicast.
 * DNS errors with codes `ENOTFOUND`, `ENODATA`, `EAI_AGAIN`, and `ENOTIMP` are suppressed; other DNS errors are rethrown.
 *
 * @param {string} hostname - Hostname or IP literal to validate.
 * @throws {Error} If the input or any resolved address is private, link-local, loopback, or multicast.
 */
async function checkIPSafety(hostname) {
	if (isIP(hostname)) {
		const ip = hostname;
		if (isPrivateIP(ip) || isLinkLocal(ip) || isLoopback(ip) || isMulticast(ip)) {
			throw new Error(`Rejected unsafe IP address: ${ip}`);
		}
		return;
	}

	try {
		const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
		for (const { address: ip } of addresses) {
			if (isPrivateIP(ip) || isLinkLocal(ip) || isLoopback(ip) || isMulticast(ip)) {
				throw new Error(`Rejected unsafe IP address: ${ip} (resolved from ${hostname})`);
			}
		}
	} catch (err) {
		if (err.message.includes("Rejected")) {
			throw err;
		}
		// Suppress certain DNS errors to allow the request to proceed and let axios handle resolution.
		// ENOTFOUND: domain not found; ENODATA: no data in DNS response; ENOTIMP: not implemented.
		// EAI_AGAIN: temporary DNS failure - suppressed to avoid blocking on transient network issues,
		// though this could potentially be exploited in race conditions where DNS changes between
		// this check and the actual request. The trade-off favors availability over strict validation.
		if (!["ENOTFOUND", "ENODATA", "EAI_AGAIN", "ENOTIMP"].includes(err.code)) {
			throw err;
		}
	}
}

/**
 * Validate that a URL uses the `http` or `https` scheme and that its hostname (or any addresses it resolves to) is not private, link-local, loopback, or multicast.
 * @param {string} targetUrl - The URL to validate.
 * @throws {Error} If the URL's scheme is not `http:` or `https:` (message: `Invalid scheme: ${protocol}. Only http and https are allowed.`), or if the hostname or any resolved address is rejected for being private, link-local, loopback, or multicast (message: `Rejected unsafe IP address: ${ip}` or `Rejected unsafe IP address: ${ip} (resolved from ${hostname})`).
 */
async function validateUrl(targetUrl) {
	const parsed = new URL(targetUrl);

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error(`Invalid scheme: ${parsed.protocol}. Only http and https are allowed.`);
	}

	await checkIPSafety(parsed.hostname);
}

/**
 * Resolve a redirect `Location` value against a base URL and ensure the resulting absolute URL is allowed.
 * @param {string} location - The redirect `Location` header value; absolute or relative to `baseUrl`.
 * @param {string} baseUrl - Base URL used to resolve relative `location` values.
 * @returns {string} The resolved absolute URL.
 * @throws {Error} If the resolved URL's scheme is not `http` or `https`, or if its hostname/IP fails safety checks.
 */
async function validateRedirectLocation(location, baseUrl) {
	let resolvedUrl;
	if (!location.startsWith("http")) {
		resolvedUrl = new URL(location, baseUrl);
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
				try {
					const finalResponse = await axios.get(currentUrl, {
						timeout: TIMEOUT_MS,
						maxContentLength: 1024 * 1024,
						maxRedirects: 0,
						validateStatus: (status) => status >= 200 && status < 400,
					});

					redirectChain.push({
						url: currentUrl,
						status: finalResponse.status,
					});

					if (
						finalResponse.status >= 300 &&
						finalResponse.status < 400 &&
						finalResponse.headers.location
					) {
						try {
							const nextUrl = await validateRedirectLocation(
								finalResponse.headers.location,
								currentUrl,
							);
							redirectChain.push({
								url: nextUrl,
								status: "pending",
							});
						} catch (redirectErr) {
							return res.status(400).json({ msg: `Redirect blocked: ${redirectErr.message}` });
						}
					}
				} catch (getErr) {
					redirectChain.push({
						url: currentUrl,
						status: "error",
						message: getErr.message,
					});
				}
				break;
			}
		}

		if (redirectChain.length === 0 || redirectChain[redirectChain.length - 1].url !== currentUrl) {
			const finalResponse = await axios.get(currentUrl, {
				timeout: TIMEOUT_MS,
				maxContentLength: 1024 * 1024,
				maxRedirects: 0,
				validateStatus: (status) => status >= 200 && status < 400,
			});

			redirectChain.push({
				url: currentUrl,
				status: finalResponse.status,
			});

			if (
				finalResponse.status >= 300 &&
				finalResponse.status < 400 &&
				finalResponse.headers.location
			) {
				try {
					const nextUrl = await validateRedirectLocation(
						finalResponse.headers.location,
						currentUrl,
					);
					if (nextUrl) {
						redirectChain.push({
							url: nextUrl,
							status: "pending",
						});
					}
				} catch (err) {
					return res.status(400).json({ msg: `Redirect blocked: ${err.message}` });
				}
			}
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