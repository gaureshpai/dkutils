const router = require("express").Router();
const shortid = require("shortid");
const Url = require("../models/Url");

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

  try {
    let url = await Url.findOne({ originalUrl });

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
      originalUrl,
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
    return res
      .status(500)
      .json({ msg: "Server error during URL redirection." });
  }
});

module.exports = router;
