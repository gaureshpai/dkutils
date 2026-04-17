const router = require("express").Router();
const shortid = require("shortid");
const Url = require("@backend/models/Url");
const dns = require("node:dns");
const { isPrivateIP } = require("@backend/utils/ipValidation");
const { isIP } = require("node:net");

/**
 * Validates that the hostname of an absolute URL does not resolve to a private or reserved IP address.
 *
 * If the hostname is an IP literal, the IP is checked directly; if it is private or reserved an Error is thrown.
 * Otherwise DNS is resolved and each returned address is checked; if any resolved address is private or reserved an Error is thrown.
 * DNS resolution errors from the underlying lookup are not caught and will propagate to the caller.
 *
 * @param {string} url - Absolute URL whose hostname will be checked.
 * @returns {Array<{address: string, family?: number}>|null} An array of resolved address records when one or more addresses are returned; `null` if DNS lookup returned no addresses.
 * @throws {Error} If the hostname is an IP literal that is private/reserved, or if any resolved address is private/reserved.
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

	// Normalize originalUrl by prepending http:// if no protocol is present
	let normalizedUrl = originalUrl;
	if (!originalUrl.startsWith("http://") && !originalUrl.startsWith("https://")) {
		normalizedUrl = `http://${originalUrl}`;
	}

	try {
		await validateUrlHost(normalizedUrl);
	} catch (err) {
		return res.status(400).json({ msg: err.message });
	}

	try {
		let url = await Url.findOne({ originalUrl: normalizedUrl });

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
			// Re-validate the target URL before redirecting to prevent DNS-rebinding TOCTOU attacks
			try {
				await validateUrlHost(url.originalUrl);
			} catch (validationErr) {
				console.error("Redirect blocked due to validation failure:", validationErr.message);
				return res.status(400).json({ msg: "Redirect blocked: URL validation failed" });
			}
			return res.redirect(url.originalUrl);
		}
		return res.status(404).json("No url found");
	} catch (err) {
		console.error(err);
		return res.status(500).json({ msg: "Server error during URL redirection." });
	}
});

module.exports = router;