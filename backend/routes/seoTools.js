const router = require("express").Router();
const axios = require("axios");

const fetchContent = async (url) => {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    return { content: response.data, exists: true };
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      error.response.status === 404
    ) {
      return { content: "", exists: false, error: "File not found (404)" };
    }
    if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
      return { content: "", exists: false, error: "Request timed out" };
    }
    console.error(`Error fetching ${url}:`, error.message);
    return {
      content: "",
      exists: false,
      error: `Failed to fetch: ${error.message}`,
    };
  }
};

// @route   POST /api/seo/robots-txt
// @desc    Fetch and return robots.txt content for a given domain
// @access  Public
router.post("/robots-txt", async (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ msg: "Domain is required." });
  }

  const url = `http://${domain}/robots.txt`;
  const httpsUrl = `https://${domain}/robots.txt`;

  let result = await fetchContent(httpsUrl);
  if (!result.exists && result.error === "File not found (404)") {
    result = await fetchContent(url);
  }

  return res.status(200).json(result);
});

// @route   POST /api/seo/sitemap-xml
// @desc    Fetch and return sitemap.xml content for a given domain
// @access  Public
router.post("/sitemap-xml", async (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ msg: "Domain is required." });
  }

  const url = `http://${domain}/sitemap.xml`;
  const httpsUrl = `https://${domain}/sitemap.xml`;

  let result = await fetchContent(httpsUrl);
  if (!result.exists && result.error === "File not found (404)") {
    result = await fetchContent(url);
  }

  return res.status(200).json(result);
});

module.exports = router;
