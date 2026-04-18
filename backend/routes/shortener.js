const router = require("express").Router();
const shortid = require("shortid");
const Url = require("@backend/models/Url");
const dns = require("node:dns");
const { isPrivateIP } = require("@backend/utils/ipValidation");
const { isIP } = require("node:net");

/**
 * Ensure an absolute URL's hostname does not resolve to a private or reserved IP address.
 *
 * If the hostname is an IP literal, it will be validated directly; otherwise the hostname's DNS
 * resolution records are inspected and rejected if any resolved address is private or reserved.
 *
 * @param {string} url - Absolute URL whose hostname will be validated.
 * @returns {Array<{address: string, family?: number}>|null} An array of resolved address records when one or more addresses are returned; `null` if DNS lookup returned no addresses.
 * @throws {Error} If the hostname (literal IP) is private or reserved, or if any DNS-resolved address is private or reserved.
 */
async function validateUrlHost(url) {
	const urlObj = new URL(url);
	const hostname = urlObj.hostname;

	if (isIP(hostname)) {
		if (isPrivateIP(hostname)) {
			throw new Error("URL resolves to a private or reserved IP address");
		}
		return [{ address: hostname }];
	}

	const addresses = await dns.promises.lookup(hostname, {
		all: true,
		verbatim: true,
	});
	for (const { address: ip } of addresses) {
		if (isPrivateIP(ip)) {
			throw new Error(`URL resolves to a private or reserved IP address (${ip})`);
		}
	}
	return addresses.length > 0 ? addresses : null;
}

router.post("/shorten", async (req, res) => {
	const { originalUrl } = req.body;
	let baseUrl = process.env.BASE_URL;

	// Validate BASE_URL is set
	if (!baseUrl) {
		return res.status(500).json({
			msg: "Server configuration error: BASE_URL environment variable is not set.",
		});
	}

	if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
		baseUrl = `https://${baseUrl}`;
	}

	// Length guard to prevent ReDoS attacks
	const MAX_URL_LENGTH = 2083; // Common browser URL length limit
	if (!originalUrl || originalUrl.length > MAX_URL_LENGTH) {
		return res.status(400).json({
			msg: `URL length must not exceed ${MAX_URL_LENGTH} characters.`,
		});
	}

	const urlRegex =
		/^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|[a-zA-Z0-9]+\.[^\s]{2,})$/;

	if (!urlRegex.test(originalUrl)) {
		return res.status(400).json({ msg: "Please enter a valid URL." });
	}

	// Normalize originalUrl by prepending https:// if no protocol is present
	let normalizedUrl = originalUrl;
	if (!/^https?:\/\//i.test(originalUrl)) {
		normalizedUrl = `https://${originalUrl}`;
	}

	try {
		await validateUrlHost(normalizedUrl);
	} catch (err) {
		console.error("URL validation error:", err.message, err.stack);
		return res.status(400).json({ msg: "Invalid URL" });
	}

	try {
		// Check for existing URL with both normalized and original forms to catch legacy entries
		let url = await Url.findOne({
			$or: [
				{ originalUrl: normalizedUrl },
				{ originalUrl: originalUrl }
			]
		});

		if (url) {
			return res.json(url);
		}
		let urlCode;
		let shortUrl;
		let isUnique = false;

		while (!isUnique) {
			urlCode = shortid.generate();
			shortUrl = `${baseUrl}/l/${urlCode}`;
			const existingUrl = await Url.findOne({ urlCode });
			if (!existingUrl) {
				isUnique = true;
			}
		}

		url = new Url({
			originalUrl: normalizedUrl,
			shortUrl,
			urlCode,
			date: new Date(),
		});

		await url.save();
		return res.json(url);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ msg: "Server error during URL shortening." });
	}
});

// @route   GET /l/:code
// @desc    Redirect to long/original URL
// @access  Public
router.get("/l/:code", async (req, res) => {
	try {
		const url = await Url.findOne({ urlCode: req.params.code });

		if (url) {
			// Normalize the URL by prepending https:// if no protocol is present
			let normalizedUrl = url.originalUrl;
			if (!/^https?:\/\//i.test(normalizedUrl)) {
				normalizedUrl = `https://${normalizedUrl}`;
			}

			// Re-validate the target URL before redirecting to prevent DNS-rebinding TOCTOU attacks
			try {
				await validateUrlHost(normalizedUrl);
			} catch (validationErr) {
				console.error("Redirect blocked due to validation failure:", validationErr.message);
				return res.status(400).json({ msg: "Redirect blocked: URL validation failed" });
			}
			return res.redirect(normalizedUrl);
		}
		return res.status(404).json({ msg: "No url found" });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ msg: "Server error during URL redirection." });
	}
});

module.exports = router;