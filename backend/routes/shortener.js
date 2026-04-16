const router = require("express").Router();
const shortid = require("shortid");
const Url = require("@backend/models/Url");
const dns = require("node:dns");
const { isPrivateIP } = require("@backend/utils/ipValidation");
const { isIP } = require("node:net");

/**
 * Ensure a URL's hostname does not resolve to private or reserved IP addresses.
 *
 * @param {string} url - Absolute URL string whose hostname will be validated.
 * @returns {Array<{address: string, family?: number}>|null} An array of resolved address records (`address` and optional numeric `family`) when one or more addresses are found; `null` if no addresses were returned by DNS lookup.
 * @throws {Error} If any resolved address is a private or reserved IP address.
 * Note: DNS resolution errors from the underlying lookup are not caught and will propagate to the caller.
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
			return res.redirect(url.originalUrl);
		}
		return res.status(404).json("No url found");
	} catch (err) {
		console.error(err);
		return res.status(500).json({ msg: "Server error during URL redirection." });
	}
});

module.exports = router;
