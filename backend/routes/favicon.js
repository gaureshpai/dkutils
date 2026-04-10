const router = require("express").Router();
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("node:path");
const archiver = require("archiver");
const { supabase } = require("@backend/utils/supabaseClient");
const { promises: dns } = require("node:dns");
const { isPrivateIP } = require("@backend/utils/ipValidation");

// Function to validate URL and check for private IPs
const validateUrl = async (url) => {
	try {
		const urlObj = new URL(url);

		// Only allow http and https protocols
		if (!["http:", "https:"].includes(urlObj.protocol)) {
			throw new Error("Only HTTP and HTTPS protocols are allowed");
		}

		// Extract hostname and resolve to check IP addresses using system resolver
		const hostname = urlObj.hostname;
		const lookupResults = await dns.lookup(hostname, { all: true });

		if (!lookupResults || lookupResults.length === 0) {
			throw new Error("DNS resolution failed - no addresses returned");
		}

		const addresses = lookupResults.map((result) => result.address);

		// Check if any resolved IP is private
		for (const ip of addresses) {
			if (isPrivateIP(ip)) {
				throw new Error("Private IP ranges not allowed");
			}
		}

		return true;
	} catch (error) {
		throw new Error(`URL validation failed: ${error.message}`);
	}
};

const downloadFile = async (fileUrl) => {
	try {
		// Validate the URL before making the request
		await validateUrl(fileUrl);

		const response = await axios.get(fileUrl, {
			responseType: "arraybuffer",
			maxRedirects: 0, // Disable redirects to prevent SSRF chains
			timeout: 5000,
		});
		return {
			success: true,
			buffer: Buffer.from(response.data),
			contentType: response.headers["content-type"],
		};
	} catch (error) {
		console.error(`Failed to download file from ${fileUrl}:`, error.message);
		if (error.message.includes("validation failed")) {
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

	try {
		// Validate the main URL before processing
		await validateUrl(url);

		const response = await axios.get(url, {
			maxRedirects: 0, // Disable redirects to prevent SSRF chains
			timeout: 5000,
			validateStatus: (status) => status >= 200 && status < 300, // Only accept 2xx status codes
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
						const urlObj = new URL(url);
						href = `${urlObj.protocol}//${urlObj.host}${href}`;
					} else if (!href.startsWith("http")) {
						const urlObj = new URL(url);
						href = `${urlObj.href.substring(0, urlObj.href.lastIndexOf("/") + 1)}${href}`;
					}
					faviconUrls.push(href);
				}
			},
		);

		const urlObj = new URL(url);
		const defaultFavicon = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
		if (!faviconUrls.includes(defaultFavicon)) {
			faviconUrls.push(defaultFavicon);
		}

		const archive = archiver("zip", {
			zlib: { level: 9 },
		});

		// Collect all file data first to avoid race conditions
		const downloadPromises = faviconUrls.map(async (faviconUrl) => {
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
