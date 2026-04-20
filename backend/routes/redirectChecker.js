const router = require("express").Router();
const axios = require("axios");
const dns = require("node:dns");
const { isIP } = require("node:net");
const http = require("node:http");
const https = require("node:https");
const {
	isPrivateIP: isPrivateIPShared,
	normalizeIPv4Mapped,
} = require("@backend/utils/ipValidation");

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

	return false;
}

/**
 * Determines whether the given IP address is a link-local address.
 *
 * Recognizes IPv4 addresses in 169.254.0.0/16 and IPv6 addresses in fe80::/10; returns `false` for non-IP literals.
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
 * Determine whether an IP address is a loopback address.
 *
 * Normalizes IPv4-mapped IPv6 literals to IPv4 before checking. For IPv4, treats any address in 127.0.0.0/8 as loopback; for IPv6, treats only `::1` as loopback.
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
 * Determine if an IP literal is a multicast address.
 *
 * IPv4-mapped IPv6 literals (starting with `::ffff:`) are treated as their IPv4 equivalent.
 * @param {string} ip - IPv4 dotted-quad or IPv6 literal.
 * @returns {boolean} `true` if the address is multicast (IPv4: 224.0.0.0/4; IPv6: ff00::/8), `false` otherwise.
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
 * Validate that a hostname or IP literal does not resolve to disallowed address classes: private, link-local, loopback, or multicast.
 *
 * @param {string} hostname - Hostname or IP literal to check.
 * @returns {Array<{address: string, family: number}>|null} An array of validated DNS records (`address` and numeric `family`) when addresses were resolved and validated; `null` when resolution produced no addresses or when DNS resolution was suppressed for certain DNS errors.
 * @throws {Error} If the input or any resolved address is private, link-local, loopback, or multicast. Error messages are prefixed with `Rejected unsafe IP address:`.
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
		const addresses = await dns.promises.lookup(hostname, {
			all: true,
			verbatim: true,
		});
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
 * Validate that a URL uses the `http` or `https` scheme and that its hostname and resolved IP addresses are safe for network requests.
 * @param {string} targetUrl - The URL to validate.
 * @returns {{hostname: string, safeAddresses: Array<{address: string, family: number}>}} The parsed hostname and a list of validated IP addresses suitable for connection pinning.
 * @throws {Error} If the scheme is not `http:` or `https:` (message: `Invalid scheme: ${protocol}. Only http and https are allowed.`), if DNS validation could not verify address safety (message: `DNS validation failed - unable to verify address safety`), or if the hostname/resolved IPs are rejected for being private, link-local, loopback, or multicast (messages like `Rejected unsafe IP address: ${ip}` or `Rejected unsafe IP address: ${ip} (resolved from ${hostname})`).
 */
async function validateUrl(targetUrl) {
	const parsed = new URL(targetUrl);

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error(`Invalid scheme: ${parsed.protocol}. Only http and https are allowed.`);
	}

	const safeAddresses = await checkIPSafety(parsed.hostname);
	if (safeAddresses === null) {
		throw new Error("DNS validation failed - unable to verify address safety");
	}
	return { hostname: parsed.hostname, safeAddresses };
}

/**
 * Resolve a redirect `Location` value against a base URL and validate the resolved absolute URL for safe connection pinning.
 * @param {string} location - The redirect `Location` header value; absolute or relative to `baseUrl`.
 * @param {string} baseUrl - Base URL used to resolve relative `location` values.
 * @returns {{url: string, safeAddresses: Array<{address: string, family: number}>}} The resolved absolute URL and the validated IP addresses to pin connections to.
 * @throws {Error} If the resolved URL's scheme is not `http` or `https`, or if DNS/IP safety validation fails for the resolved hostname.
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
 * Inspect an Axios response for an HTTP redirect and, if present, resolve and validate its Location target.
 *
 * @param {import("axios").AxiosResponse} response - Axios response to inspect for a `Location` header and status code.
 * @param {string} currentUrl - Base URL used to resolve relative `Location` values.
 * @returns {{shouldContinue: boolean, nextUrl?: string, nextHostname?: string, nextSafeAddresses?: Array<{address: string, family: number}>|null}} An object indicating whether a validated redirect should be followed; when a validated redirect is found, includes `nextUrl`, `nextHostname`, and `nextSafeAddresses`.
 * @throws {Error} If the `Location` header cannot be resolved to a valid URL or resolves to an unsafe IP address.
 */
async function handleRedirectResponse(response, currentUrl) {
	if (response.status >= 300 && response.status < 400 && response.headers.location) {
		const { url: nextUrl, safeAddresses: nextSafeAddresses } = await validateRedirectLocation(
			response.headers.location,
			currentUrl,
		);
		const parsed = new URL(nextUrl);
		return {
			shouldContinue: true,
			nextUrl,
			nextHostname: parsed.hostname,
			nextSafeAddresses,
		};
	}
	return { shouldContinue: false };
}

/**
 * Create HTTP and HTTPS agents that pin DNS resolution for a specific hostname to a validated set of IP addresses.
 *
 * When a request's hostname equals the given `hostname`, the agents' custom lookup will return only the provided `validatedAddresses`
 * (honoring `family` and `all` options); for other hostnames the lookup delegates to the system DNS.
 *
 * @param {string} hostname - Hostname whose resolution will be pinned.
 * @param {Array<{address: string, family: number}>|null} validatedAddresses - Validated DNS records to use for `hostname`, or `null` to indicate DNS validation was suppressed.
 * @throws {Error} If `validatedAddresses` is `null`.
 * @returns {{httpAgent: http.Agent, httpsAgent: https.Agent}} An object containing `httpAgent` and `httpsAgent` configured to use the pinned lookup.
 */
function createPinnedAgents(hostname, validatedAddresses) {
	if (validatedAddresses === null) {
		throw new Error("Cannot create pinned agents: DNS validation was suppressed");
	}
	/**
	 * Custom DNS lookup function that pins the resolution of a specific hostname to a validated set of IP addresses.
	 * If the request hostname equals the target hostname, the function returns the validated IP address(es) that match the requested family (or all addresses if no family is specified).
	 * Otherwise, the function falls back to the normal DNS lookup.
	 * @param {string} requestHostname - The hostname being resolved.
	 * @param {Object|number} options - Options for the DNS lookup (family and all).
	 * @param {Function} callback - The callback function to receive the DNS lookup result.
	 */
	const lookupFunction = (requestHostname, options, callback) => {
		// If we have validated addresses and the request is for our target hostname, use a pinned IP
		if (validatedAddresses && requestHostname === hostname) {
			// Determine the requested family (4 for IPv4, 6 for IPv6)
			const family = typeof options === "number" ? options : options?.family;
			// Check if options.all is true (only when options is an object, not a number)
			const returnAll = typeof options === "object" && options?.all === true;

			if (returnAll) {
				// Filter by family if specified, otherwise return all
				const validatedAddressesFiltered = family
					? validatedAddresses.filter((entry) => entry.family === family)
					: validatedAddresses;

				if (validatedAddressesFiltered.length === 0) {
					return callback(new Error("No validated DNS records available"));
				}

				// Return array of {address, family} objects
				return callback(
					null,
					validatedAddressesFiltered.map((e) => ({
						address: e.address,
						family: e.family,
					})),
				);
			}
			// Prefer a record matching the request's family, or fall back to any validated record
			const candidate =
				validatedAddresses.find((entry) => !family || entry.family === family) ??
				validatedAddresses[0];

			if (!candidate) {
				return callback(new Error("No validated DNS records available"));
			}

			return callback(null, candidate.address, candidate.family);
		}
		// Fallback to normal DNS lookup for other hostnames
		dns.lookup(requestHostname, options, callback);
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
				let response = await axios.head(currentUrl, {
					maxRedirects: 0,
					validateStatus: () => true, // Accept all HTTP statuses
					timeout: TIMEOUT_MS,
					maxContentLength: 1024 * 1024,
					httpAgent: agents.httpAgent,
					httpsAgent: agents.httpsAgent,
				});

				// If HEAD returned 405 or 501, retry with GET
				if (response.status === 405 || response.status === 501) {
					response = await axios.get(currentUrl, {
						maxRedirects: 0,
						validateStatus: () => true, // Accept all HTTP statuses
						timeout: TIMEOUT_MS,
						maxContentLength: 1024 * 1024,
						httpAgent: agents.httpAgent,
						httpsAgent: agents.httpsAgent,
					});
				}

				redirectChain.push({ url: currentUrl, status: response.status });

				try {
					const redirect = await handleRedirectResponse(response, currentUrl);
					if (redirect.shouldContinue) {
						currentUrl = redirect.nextUrl;
						currentHostname = redirect.nextHostname;
						currentSafeAddresses = redirect.nextSafeAddresses;
						continue;
					}
					break;
				} catch (err) {
					return res.status(400).json({ msg: `Redirect blocked: ${err.message}` });
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

					try {
						const redirect = await handleRedirectResponse(finalResponse, currentUrl);
						if (redirect.shouldContinue) {
							currentUrl = redirect.nextUrl;
							currentHostname = redirect.nextHostname;
							currentSafeAddresses = redirect.nextSafeAddresses;
							continue;
						}
					} catch (redirectErr) {
						return res.status(400).json({ msg: `Redirect blocked: ${redirectErr.message}` });
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

				try {
					const redirect = await handleRedirectResponse(finalResponse, currentUrl);
					if (redirect.shouldContinue) {
						redirectChain.push({
							url: redirect.nextUrl,
							status: "pending",
						});
					}
				} catch (err) {
					return res.status(400).json({ msg: `Redirect blocked: ${err.message}` });
				}
			} catch (err) {
				redirectChain.push({
					url: currentUrl,
					status: "error",
					message: err.message,
				});
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
		} else if (err.request) {
			errorMessage = "No response received from the server.";
		} else {
			errorMessage = err.message;
		}
		return res.status(500).json({ msg: errorMessage });
	}
});

module.exports = router;
