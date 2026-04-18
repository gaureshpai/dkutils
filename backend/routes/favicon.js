const router = require("express").Router();
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("node:path");
const archiver = require("archiver");
const http = require("node:http");
const https = require("node:https");
const dns = require("node:dns");
const { supabase } = require("@backend/utils/supabaseClient");
const { isPrivateIP, normalizeIPv4Mapped } = require("@backend/utils/ipValidation");

/**
 * Validate that a hostname or IP literal does not resolve to private, link-local, loopback, or multicast addresses.
 *
 * For an IP literal the function validates that single address; for a domain name it resolves A/AAAA records
 * and validates each resolved address. Returns `null` only when DNS resolution yields no addresses.
 *
 * @param {string} hostname - Hostname or IP literal to validate.
 * @returns {Array<{address: string, family: number}>|null} An array of validated DNS records (`address` and numeric `family`), or `null` when no addresses were found.
 * @throws {Error} If the input or any resolved address is private, link-local, loopback, or multicast. Error messages are prefixed with `Rejected unsafe IP address:`.
 */
async function checkIPSafety(hostname) {
	const { isIP } = require("node:net");

	if (isIP(hostname)) {
		const ip = hostname;
		if (isPrivateIP(ip)) {
			const error = new Error(`Rejected unsafe IP address: ${ip}`);
			error.isValidationError = true;
			throw error;
		}
		return [{ address: ip, family: isIP(ip) }];
	}

	const addresses = await dns.promises.lookup(hostname, {
		all: true,
		verbatim: true,
	});
	for (const { address: ip } of addresses) {
		if (isPrivateIP(ip)) {
			const error = new Error(`Rejected unsafe IP address: ${ip} (resolved from ${hostname})`);
			error.isValidationError = true;
			throw error;
		}
	}
	return addresses.length > 0 ? addresses : null;
}

/**
 * Ensures a URL uses http(s) and that its hostname resolves to safe IP addresses for connection pinning.
 * @param {string} url - The URL to validate.
 * @returns {{hostname: string, safeAddresses: Array<{address: string, family: number}>}} The parsed hostname and validated IP address records suitable for pinning.
 * @throws {Error} If the URL scheme is not `http:` or `https:` (message: `"Only HTTP and HTTPS protocols are allowed"`), if DNS validation cannot verify address safety (message: `"DNS validation failed - unable to verify address safety"`), or if resolved addresses are rejected as unsafe (messages like `"Rejected unsafe IP address: <ip>"` or `"Rejected unsafe IP address: <ip> (resolved from <hostname>)"`).
 */
async function validateUrl(url) {
	const urlObj = new URL(url);
	if (!["http:", "https:"].includes(urlObj.protocol)) {
		const error = new Error("Only HTTP and HTTPS protocols are allowed");
		error.isValidationError = true;
		throw error;
	}

	const safeAddresses = await checkIPSafety(urlObj.hostname);
	if (safeAddresses === null) {
		const error = new Error("DNS validation failed - unable to verify address safety");
		error.isValidationError = true;
		throw error;
	}
	return { hostname: urlObj.hostname, safeAddresses };
}

/**
 * Create HTTP and HTTPS agents that pin DNS resolution for a specific hostname to a set of validated IP addresses.
 *
 * When `validatedAddresses` is provided and the requested hostname equals `hostname`, the agents resolve that hostname
 * only to the supplied `{ address, family }` entries. For other hostnames (or when `validatedAddresses` is falsy),
 * the agents delegate resolution to the system DNS lookup.
 *
 * @param {string} hostname - The target hostname whose DNS resolution should be pinned.
 * @param {Array<{address: string, family: number}>} validatedAddresses - Validated DNS answers to be returned for the target hostname.
 * @returns {{httpAgent: http.Agent, httpsAgent: https.Agent}} An object containing HTTP and HTTPS agents configured to use the pinned lookup.
 */
function createPinnedAgents(hostname, validatedAddresses) {
	const lookupFunction = (requestHostname, options, callback) => {
		if (validatedAddresses && requestHostname === hostname) {
			const family = typeof options === "number" ? options : options?.family;
			const returnAll = typeof options === "object" && options?.all === true;

			if (returnAll) {
				const validatedAddressesFiltered = family
					? validatedAddresses.filter((entry) => entry.family === family)
					: validatedAddresses;

				if (validatedAddressesFiltered.length === 0) {
					return callback(new Error("No validated DNS records available"));
				}
				return callback(
					null,
					validatedAddressesFiltered.map((e) => ({
						address: e.address,
						family: e.family,
					})),
				);
			}
			const candidate =
				validatedAddresses.find((entry) => !family || entry.family === family) ??
				validatedAddresses[0];

			if (!candidate) {
				return callback(new Error("No validated DNS records available"));
			}
			return callback(null, candidate.address, candidate.family);
		}
		dns.lookup(requestHostname, options, callback);
	};

	return {
		httpAgent: new http.Agent({ lookup: lookupFunction }),
		httpsAgent: new https.Agent({ lookup: lookupFunction }),
	};
}

/**
 * Downloads a file from a given URL and returns its contents and content type.
 * @param {string} fileUrl - The URL of the file to download.
 * @returns {Promise<object>} A promise that resolves to an object containing the file contents, content type, and success status.
 * @throws {Error} If the download fails due to a non-404 error, or if the URL is blocked due to validation failure.
 */
const downloadFile = async (fileUrl) => {
	try {
		// Validate the URL and get pinned agents to prevent DNS rebinding
		const { hostname, safeAddresses } = await validateUrl(fileUrl);
		const agents = createPinnedAgents(hostname, safeAddresses);

		const response = await axios.get(fileUrl, {
			responseType: "arraybuffer",
			maxRedirects: 0,
			timeout: 5000,
			httpAgent: agents.httpAgent,
			httpsAgent: agents.httpsAgent,
		});
		return {
			success: true,
			buffer: Buffer.from(response.data),
			contentType: response.headers["content-type"],
		};
	} catch (error) {
		console.error(`Failed to download file from ${fileUrl}:`, error.message);
		if (error.isValidationError) {
			return {
				success: false,
				reason: "blocked",
				message: error.message,
				blocked: true,
			};
		}
		if (axios.isAxiosError(error) && error.response?.status === 404) {
			return {
				success: false,
				reason: "not_found",
				message: error.message,
				blocked: false,
			};
		}
		if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
			return {
				success: false,
				reason: "timeout",
				message: error.message,
				blocked: false,
			};
		}
		return {
			success: false,
			reason: "other",
			message: error.message,
			blocked: false,
		};
	}
};

// @route   POST /api/favicon
// @desc    Extract favicons from a given URL and upload to Supabase as a ZIP
// @access  Public
router.post("/", async (req, res) => {
	const { url } = req.body;

	if (!url) {
		return res.status(400).json({ msg: "URL is required" });
	}

	// Normalize URL by prepending https:// if no protocol is present
	let normalizedUrl = url.trim();
	if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
		normalizedUrl = `https://${normalizedUrl}`;
	}

	try {
		// Validate the main URL and get pinned agents to prevent DNS rebinding
		const { hostname, safeAddresses } = await validateUrl(normalizedUrl);
		const agents = createPinnedAgents(hostname, safeAddresses);

		const response = await axios.get(normalizedUrl, {
			maxRedirects: 0,
			timeout: 5000,
			validateStatus: (status) => status >= 200 && status < 300,
			httpAgent: agents.httpAgent,
			httpsAgent: agents.httpsAgent,
		});
		const $ = cheerio.load(response.data);
		const faviconUrls = [];

		$('link[rel~="icon"], link[rel~="shortcut icon"], link[rel~="apple-touch-icon"]').each(
			(i, el) => {
				let href = $(el).attr("href");
				if (href) {
					if (href.startsWith("//")) {
						href = `https:${href}`;
					} else if (href.startsWith("/")) {
						const urlObj = new URL(normalizedUrl);
						href = `${urlObj.protocol}//${urlObj.host}${href}`;
					} else if (!href.startsWith("http")) {
						const urlObj = new URL(normalizedUrl);
						href = `${urlObj.href.substring(0, urlObj.href.lastIndexOf("/") + 1)}${href}`;
					}
					faviconUrls.push(href);
				}
			},
		);

		const urlObj = new URL(normalizedUrl);
		const defaultFavicon = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
		if (!faviconUrls.includes(defaultFavicon)) {
			faviconUrls.push(defaultFavicon);
		}

		// Deduplicate and cap the number of favicon URLs to prevent abuse
		const MAX_FAVICONS = 10;
		const uniqueFaviconUrls = [...new Set(faviconUrls)].slice(0, MAX_FAVICONS);

		const archive = archiver("zip", {
			zlib: { level: 9 },
		});

		// Collect all file data first to avoid race conditions
		const downloadPromises = uniqueFaviconUrls.map(async (faviconUrl) => {
			const fileData = await downloadFile(faviconUrl);
			if (fileData?.buffer) {
				const fileName = `favicon-${path.basename(new URL(faviconUrl).pathname || "default.ico")}`;
				return {
					buffer: fileData.buffer,
					name: fileName,
					contentType: fileData.contentType,
				};
			}
			return null;
		});

		const fileDataArray = await Promise.all(downloadPromises);
		const validFiles = fileDataArray.filter((file) => file !== null);

		if (validFiles.length === 0) {
			return res.status(404).json({ msg: "No favicons found or all downloads failed." });
		}

		if (validFiles.length === 1) {
			const file = validFiles[0];
			const outputFileName = `favicon_dkutils_${Date.now()}_${file.name}`;
			const { error } = await supabase.storage
				.from("utilityhub")
				.upload(`favicons/${outputFileName}`, file.buffer, {
					contentType: file.contentType || "image/x-icon",
					upsert: true,
				});

			if (error) {
				console.error("Supabase upload error:", error);
				return res.status(500).json({
					msg: "Failed to upload favicon to Supabase",
					error: error.message,
				});
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(`favicons/${outputFileName}`)}`;

			return res.status(200).json({ path: downloadUrl, originalname: outputFileName });
		}

		const zipBuffer = await new Promise((resolve, reject) => {
			const buffers = [];
			archive.on("data", (data) => buffers.push(data));
			archive.on("end", () => resolve(Buffer.concat(buffers)));
			archive.on("error", (err) => reject(err));

			// Append files sequentially after all downloads complete
			for (const file of validFiles) {
				archive.append(file.buffer, { name: file.name });
			}

			archive.finalize();
		});

		const zipFileName = `favicons_dkutils_${Date.now()}.zip`;
		const { error } = await supabase.storage
			.from("utilityhub")
			.upload(`favicons/${zipFileName}`, zipBuffer, {
				contentType: "application/zip",
				upsert: true,
			});

		if (error) {
			console.error("Supabase upload error:", error);
			return res.status(500).json({
				msg: "Failed to upload favicon ZIP to Supabase",
				error: error.message,
			});
		}

		const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(`favicons/${zipFileName}`)}`;

		return res.status(200).json({ path: downloadUrl, originalname: zipFileName });
	} catch (err) {
		console.error("Error extracting favicons:", err);
		return res.status(500).json({
			msg: "Failed to extract favicons. Please check the URL.",
			error: err.message,
		});
	}
});

module.exports = router;