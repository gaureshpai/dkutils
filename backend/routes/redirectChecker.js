const router = require("express").Router();
const axios = require("axios");
const dns = require("node:dns");
const { isIP } = require("node:net");
const http = require("node:http");
const https = require("node:https");
const { isPrivateIP: isPrivateIPShared, normalizeIPv4Mapped } = require("@backend/utils/ipValidation");

const MAX_REDIRECTS = 10;
const TIMEOUT_MS = 5000;

/**
 * Determine whether an IP literal is in a private or otherwise local address range.
 *
 * Accepts IPv4 and IPv6 literals (including IPv4-mapped IPv6) and treats RFC1918 IPv4 ranges
 * and IPv6 Unique Local Addresses (fc00::/7) as private/local.
 * @param {string} ip - The IP address literal to test.
 * @returns {boolean} `true` if the address is private or local, `false` otherwise.
 */
function isPrivateIP(ip) {
	// Normalize IPv4-mapped IPv6 addresses to their IPv4 form
	const normalizedIp = normalizeIPv4Mapped(ip);

	// Use shared validator which covers both IPv4 and IPv6 private ranges
	if (isPrivateIPShared(normalizedIp)) {
		return true;
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
	const normalizedIp = normalizeIPv4Mapped(ip);
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
 * Checks whether an IP address is a loopback address.
 *
 * Normalizes IPv4-mapped IPv6 addresses to IPv4 form before checking.
 * Considers IPv4 loopback as 127.0.0.0/8 and IPv6 loopback as ::1.
 * @param {string} ip - The IP address to check.
 * @returns {boolean} `true` if the address is a loopback address, `false` otherwise.
 */
function isLoopback(ip) {
	const normalizedIp = normalizeIPv4Mapped(ip);
	if (isIP(normalizedIp) === 4) {
		return normalizedIp.startsWith("127.");
	}
	if (isIP(normalizedIp) === 6) {
		const normalized = normalizedIp.toLowerCase();
		if (normalized === "::1") {
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
	const normalizedIp = normalizeIPv4Mapped(ip);
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
 * Validate that a hostname or IP literal does not refer to private, link-local, loopback, or multicast addresses.
 *
 * If given an IP literal, the function throws when that IP is unsafe. If given a hostname, it resolves all A/AAAA
 * records and throws when any resolved address is unsafe. DNS errors with codes `ENOTFOUND`, `ENODATA`, `EAI_AGAIN`,
 * and `ENOTIMP` are suppressed and cause the function to return `null`.
 *
 * @param {string} hostname - Hostname or IP literal to validate.
 * @returns {Array<{address: string, family: number}>|null} Array of validated IP address records with their families,
 *                                                            or `null` if no addresses were found or DNS errors were suppressed.
 * @throws {Error} If the input or any resolved address is private, link-local, loopback, or multicast.
 */
async function checkIPSafety(hostname) {
	if (isIP(hostname)) {
		const ip = hostname;
		if (isPrivateIP(ip) || isLinkLocal(ip) || isLoopback(ip) || isMulticast(ip)) {
			throw new Error(`Rejected unsafe IP address: ${ip}`);
		}
		// Return as an array with family for consistency
		const family = isIP(ip);
		return [{ address: ip, family }];
	}

	try {
		const addresses = await dns.promises.lookup(hostname, { all: true, verbatim: true });
		for (const { address: ip } of addresses) {
			if (isPrivateIP(ip) || isLinkLocal(ip) || isLoopback(ip) || isMulticast(ip)) {
				throw new Error(`Rejected unsafe IP address: ${ip} (resolved from ${hostname})`);
			}
		}
		// Return the full list of validated addresses
		return addresses.length > 0 ? addresses : null;
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
		return null;
	}
}

/**
 * Validate that a URL uses the `http` or `https` scheme and that its hostname (or any addresses it resolves to) is not private, link-local, loopback, or multicast.
 * @param {string} targetUrl - The URL to validate.
 * @returns {{hostname: string, safeAddresses: Array<{address: string, family: number}>|null}} The parsed hostname and validated IP addresses for connection pinning, or `null` if no addresses were resolved.
 * @throws {Error} If the URL's scheme is not `http:` or `https:` (message: `Invalid scheme: ${protocol}. Only http and https are allowed.`), or if the hostname or any resolved address is rejected for being private, link-local, loopback, or multicast (messages: `Rejected unsafe IP address: ${ip}` or `Rejected unsafe IP address: ${ip} (resolved from ${hostname})`).
 */
async function validateUrl(targetUrl) {
	const parsed = new URL(targetUrl);

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error(`Invalid scheme: ${parsed.protocol}. Only http and https are allowed.`);
	}

	const safeAddresses = await checkIPSafety(parsed.hostname);
	return { hostname: parsed.hostname, safeAddresses };
}

/**
 * Resolve a redirect `Location` value against a base URL and validate the resulting absolute URL.
 * @param {string} location - The redirect `Location` header value; absolute or relative to `baseUrl`.
 * @param {string} baseUrl - Base URL used to resolve relative `location` values.
 * @returns {{url: string, safeAddresses: Array<{address: string, family: number}>|null}} The resolved absolute URL and validated IP addresses to pin connections to, or `null` if no pinning is available.
 * @throws {Error} If the resolved URL's scheme is not `http` or `https`, or if its hostname/IP fails safety checks.
 */
async function validateRedirectLocation(location, baseUrl) {
	let resolvedUrl;
	if (!location.startsWith("http")) {
		resolvedUrl = new URL(location, baseUrl);
	} else {
		resolvedUrl = new URL(location);
	}

	const { safeAddresses } = await validateUrl(resolvedUrl.href);
	return { url: resolvedUrl.href, safeAddresses };
}

/**
 * Create HTTP and HTTPS agents that resolve a specific hostname to a pinned IP when provided.
 *
 * When `validatedAddresses` is set and the requested hostname matches `hostname`, the agents' DNS lookup
 * will return a pinned IP preferring the requested address family; otherwise they perform normal DNS resolution.
 *
 * @param {string} hostname - The original hostname whose resolution may be pinned.
 * @param {Array<{address: string, family: number}>|null} validatedAddresses - Validated IP address records to use for `hostname`, or `null` to use normal DNS.
 * @returns {{httpAgent: http.Agent, httpsAgent: https.Agent}} Agents whose lookup can be pinned to validated addresses.
 */
function createPinnedAgents(hostname, validatedAddresses) {
	const lookupFunction = (requestHostname, options, callback) => {
		// If we have validated addresses and the request is for our target hostname, use a pinned IP
		if (validatedAddresses && requestHostname === hostname) {
			// Determine the requested family (4 for IPv4, 6 for IPv6)
			const family = typeof options === "number" ? options : options?.family;
			// Prefer a record matching the request's family, or fall back to any validated record
			const candidate =
				validatedAddresses.find((entry) => !family || entry.family === family) ??
				validatedAddresses[0];

			if (!candidate) {
				return callback(new Error("No validated DNS records available"));
			}

			return callback(null, candidate.address, candidate.family);
		} else {
			// Fallback to normal DNS lookup for other hostnames
			dns.lookup(requestHostname, options, callback);
		}
	};

	return {
		httpAgent: new http.Agent({ lookup: lookupFunction }),
		httpsAgent: new https.Agent({ lookup: lookupFunction }),
	};
}

// @route   POST /api/redirect-checker
// @desc    Check URL redirects and return the redirect chain
// @access  Public
router.post("/", async (req, res) => {
	const { url } = req.body;

	if (!url) {
		return res.status(400).json({ msg: "URL is required" });
	}

	let initialValidation;
	try {
		initialValidation = await validateUrl(url);
	} catch (err) {
		return res.status(400).json({ msg: err.message });
	}

	const redirectChain = [];
	let currentUrl = url;
	let currentHostname = initialValidation.hostname;
	let currentSafeAddresses = initialValidation.safeAddresses;

	try {
		for (let i = 0; i < MAX_REDIRECTS; i += 1) {
			// Create pinned agents for DNS rebinding prevention
			const agents = createPinnedAgents(currentHostname, currentSafeAddresses);

			try {
				const response = await axios.head(currentUrl, {
					maxRedirects: 0,
					validateStatus: () => true, // Accept all HTTP statuses
					timeout: TIMEOUT_MS,
					maxContentLength: 1024 * 1024,
					httpAgent: agents.httpAgent,
					httpsAgent: agents.httpsAgent,
				});

				redirectChain.push({ url: currentUrl, status: response.status });

				if (response.status >= 300 && response.status < 400 && response.headers.location) {
					try {
						const { url: nextUrl, safeAddresses: nextSafeAddresses } = await validateRedirectLocation(
							response.headers.location,
							currentUrl,
						);
						currentUrl = nextUrl;
						const parsed = new URL(currentUrl);
						currentHostname = parsed.hostname;
						currentSafeAddresses = nextSafeAddresses;
						continue;
					} catch (err) {
						return res.status(400).json({ msg: `Redirect blocked: ${err.message}` });
					}
				} else {
					break;
				}
			} catch (err) {
				// HEAD failed, try GET as fallback
				try {
					const agents = createPinnedAgents(currentHostname, currentSafeAddresses);
					const finalResponse = await axios.get(currentUrl, {
						timeout: TIMEOUT_MS,
						maxContentLength: 1024 * 1024,
						maxRedirects: 0,
						validateStatus: () => true, // Accept all HTTP statuses
						httpAgent: agents.httpAgent,
						httpsAgent: agents.httpsAgent,
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
							const { url: nextUrl, safeAddresses: nextSafeAddresses } = await validateRedirectLocation(
								finalResponse.headers.location,
								currentUrl,
							);
							currentUrl = nextUrl;
							const parsed = new URL(currentUrl);
							currentHostname = parsed.hostname;
							currentSafeAddresses = nextSafeAddresses;
							continue;
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

		// Final fetch if we haven't recorded this URL yet
		if (redirectChain.length === 0 || redirectChain[redirectChain.length - 1].url !== currentUrl) {
			const agents = createPinnedAgents(currentHostname, currentSafeAddresses);
			const finalResponse = await axios.get(currentUrl, {
				timeout: TIMEOUT_MS,
				maxContentLength: 1024 * 1024,
				maxRedirects: 0,
				validateStatus: () => true, // Accept all HTTP statuses
				httpAgent: agents.httpAgent,
				httpsAgent: agents.httpsAgent,
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
					const { url: nextUrl } = await validateRedirectLocation(
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
		// Log only non-sensitive error information
		const sanitizedLog = {
			message: err.message,
			status: err.response?.status,
			location: err.response?.headers?.location,
		};
		console.error("Error checking redirects:", sanitizedLog);
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