const router = require("express").Router();

// @route   POST /api/convert/base64-text
// @desc    Encode/Decode text to/from Base64
// @access  Public
router.post("/base64-text", (req, res) => {
  const { text, type } = req.body;

  if (!text || !type) {
    return res
      .status(400)
      .json({ msg: "Text and type (encode/decode) are required." });
  }

  try {
    let result;
    if (type === "encode") {
      result = Buffer.from(text).toString("base64");
    } else if (type === "decode") {
      result = Buffer.from(text, "base64").toString("utf8");
    } else {
      return res
        .status(400)
        .json({ msg: "Invalid type. Must be 'encode' or 'decode'." });
    }
    return res.json({ result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ msg: "Server error during Base64 conversion." });
  }
});

module.exports = router;
