const router = require("express").Router();
const axios = require("axios");
const { supabase } = require("@backend/utils/supabaseClient");

// @route   POST /api/screenshot
// @desc    Generate screenshots of a given URL and its internal links.
// @access  Public
router.post("/", async (req, res) => {
	const { url } = req.body;

	if (!url) {
		return res.status(400).json({ msg: "URL is required" });
	}

	try {
		const screenshotUrl =
			`https://api.apiflash.com/v1/urltoimage?access_key=${process.env.API_FLASH_ACCESS_KEY}` +
			`&url=${encodeURIComponent(url)}&full_page=true`;

		const response = await axios.get(screenshotUrl, {
			responseType: "arraybuffer",
			timeout: 30000,
		});
		const imageBuffer = Buffer.from(response.data);

		const outputFileName = `screenshot_dkutils_${Date.now()}.png`;
		const { error } = await supabase.storage
			.from("utilityhub")
			.upload(`screenshots/${outputFileName}`, imageBuffer, {
				contentType: "image/png",
				upsert: true,
			});

		if (error) {
			console.error("Supabase upload failed", { code: error.code, message: "Upload failed" });
			return res.status(500).json({
				msg: "Failed to upload screenshot to storage",
			});
		}

		const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(`screenshots/${outputFileName}`)}`;

		return res.status(200).json({ path: downloadUrl, originalname: outputFileName });
	} catch (err) {
		console.error("Error generating screenshot", { message: err.code || "Unknown error" });

		// Handle timeout errors specifically
		if (err.code === "ECONNABORTED") {
			return res.status(408).json({
				msg: "Request timeout. The screenshot API took too long to respond.",
			});
		}

		return res.status(500).json({
			msg: "Failed to generate screenshot. Please try again.",
		});
	}
});

module.exports = router;
