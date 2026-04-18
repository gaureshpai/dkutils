const router = require("express").Router();

// Helper function to validate Base64 string
const isValidBase64 = (str) => {
	try {
		return Buffer.from(str, "base64").toString("base64") === str.trim();
	} catch {
		return false;
	}
};

// @route   POST /api/convert/base64-text
// @desc    Encode/Decode text to/from Base64
// @access  Public
router.post("/base64-text", (req, res) => {
	const { text, type } = req.body;

	if (typeof text !== "string" || text.length === 0 || !type) {
		return res.status(400).json({ msg: "Text and type (encode/decode) are required." });
	}

	try {
		let result;
		if (type === "encode") {
			result = Buffer.from(text).toString("base64");
		} else if (type === "decode") {
			if (!isValidBase64(text)) {
				return res.status(400).json({ msg: "Invalid Base64 input." });
			}
			result = Buffer.from(text, "base64").toString("utf8");
		} else {
			return res.status(400).json({ msg: "Invalid type. Must be 'encode' or 'decode'." });
		}
		return res.json({ result });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ msg: "Server error during Base64 conversion." });
	}
});

module.exports = router;
