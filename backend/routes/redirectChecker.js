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
	// Use shared validator which covers both IPv4 and IPv6 private ranges
	if (isPrivateIPShared(ip)) {
		return true;
	}

	// Additional IPv4 private range checks for backward compatibility
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

	// Check for IPv6 ULA (fc00::/7 - covers both fc00::/8 and fd00::/8)
	if (isIP(ip) === 6) {
		const normalized = ip.toLowerCase();
		if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
			return true;
		}
		// Check for IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
		if (normalized.startsWith("::ffff:")) {
			const ipv4Part = ip.substring(7);
			return isPrivateIP(ipv4Part);
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
	if (isIP(ip) === 4) {
		const parts = ip.split(".").map(Number);
		return parts[0] === 169 && parts[1] === 254;
	}
	if (isIP(ip) === 6) {
		const normalized = ip.toLowerCase();
		return normalized.startsWith("fe80:");
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
 * Determine whether an IP address is a multicast address.
 * IPv4: 224.0.0.0/4 (224-239)
 * IPv6: ff00::/8
 * @param {string} ip - The IP address to check (IPv4 dotted-quad or IPv6).
 * @returns {boolean} `true` if the address is a multicast address, `false` otherwise.
 */
function isMulticast(ip) {
	if (isIP(ip) === 4) {
		const parts = ip.split(".").map(Number);
		return parts[0] >= 224 && parts[0] <= 239;
	}
	if (isIP(ip) === 6) {
		const normalized = ip.toLowerCase();
		return normalized.startsWith("ff");
	}
	return false;
}

/**
 * Ensure a hostname or IP literal does not equal or resolve to an unsafe network address.
 *
 * If given an IP literal, rejects when the address is private, link-local, loopback, or multicast.
 * If given a hostname, resolves both A (IPv4) and AAAA (IPv6) records independently and rejects if any returned address is unsafe.
 * Both IPv4 and IPv6 resolution are attempted separately to ensure comprehensive validation.
 * Non-rejection DNS resolution errors are ignored so callers may still attempt the outbound request.
 *
 * @param {string} hostname - Hostname or IP literal to validate.
 * @throws {Error} If the input or any resolved address is unsafe:
 *   - IPv4: private, link-local, loopback, or multicast
 *   - IPv6: private, link-local, loopback, or multicast
 */
async function checkIPSafety(hostname) {
	if (isIP(hostname)) {
		const ip = hostname;
		if (isPrivateIP(ip) || isLinkLocal(ip) || isLoopback(ip) || isMulticast(ip)) {
			throw new Error(`Rejected unsafe IP address: ${ip}`);
		}
		return;
	}

	// Run IPv4 resolution independently
	try {
		const addresses = await dns.resolve4(hostname);
		for (const ip of addresses) {
			if (isPrivateIP(ip) || isLinkLocal(ip) || isLoopback(ip) || isMulticast(ip)) {
				throw new Error(`Rejected unsafe IP address: ${ip} (resolved from ${hostname})`);
			}
		}
	} catch (err) {
		// Propagate "Rejected unsafe..." errors instead of swallowing them
		if (err.message.includes("Rejected")) {
			throw err;
		}
		// Suppress true DNS resolution errors (e.g., ENOTFOUND, ENODATA)
	}

	// Run IPv6 resolution independently (not nested in IPv4 catch)
	try {
		const addresses6 = await dns.resolve6(hostname);
		for (const ip of addresses6) {
			if (isPrivateIP(ip) || isLinkLocal(ip) || isLoopback(ip) || isMulticast(ip)) {
				throw new Error(`Rejected unsafe IPv6 address: ${ip} (resolved from ${hostname})`);
			}
		}
	} catch (err) {
		// Propagate "Rejected unsafe..." errors instead of swallowing them
		if (err.message.includes("Rejected")) {
			throw err;
		}
		// Suppress true DNS resolution errors (e.g., ENOTFOUND, ENODATA)
	}
}

/**
 * Validate that a URL uses the http or https scheme and that its hostname (or resolved addresses) is safe.
 * @param {string} targetUrl - The URL to validate.
 * @throws {Error} If the URL's scheme is not `http:` or `https:` (message: `Invalid scheme: ...`), or if the hostname or any resolved address is rejected for being private, link-local, loopback, or multicast (message: `Rejected unsafe IP address: ...` or `Rejected unsafe IP address: ... (resolved from ...)`).
 */
async function validateUrl(targetUrl) {
	const parsed = new URL(targetUrl);

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error(`Invalid scheme: ${parsed.protocol}. Only http and https are allowed.`);
	}

	await checkIPSafety(parsed.hostname);
}

/**
 * Resolve a redirect `Location` header value against a base URL and validate the resulting absolute URL.
 * @param {string} location - The redirect `Location` header value; may be an absolute URL or a path relative to `baseUrl`.
 * @param {string} baseUrl - The base URL used to resolve relative `location` values.
 * @returns {string} The resolved absolute URL.
 * @throws {Error} If the resolved URL uses a scheme other than `http` or `https`, or if its hostname/IP is disallowed by safety checks.
 */
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
				shouldFallbackToGet = true;
				redirectChain.push({
					url: currentUrl,
					status: "error",
					message: err.message,
				});
				break;
			}
		}

		if (
			shouldFallbackToGet ||
			redirectChain.length === 0 ||
			redirectChain[redirectChain.length - 1].url !== currentUrl
		) {
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
