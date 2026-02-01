const router = require("express").Router();
const axios = require("axios");

// @route   POST /api/redirect-checker
// @desc    Check URL redirects and return the redirect chain
// @access  Public
router.post("/", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ msg: "URL is required" });
  }

  const redirectChain = [];
  let currentUrl = url;

  try {
    for (let i = 0; i < 10; i += 1) {
      try {
        const response = await axios.head(currentUrl, {
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
        });

        redirectChain.push({ url: currentUrl, status: response.status });

        if (
          response.status >= 300 &&
          response.status < 400 &&
          response.headers.location
        ) {
          currentUrl = response.headers.location;
          if (!currentUrl.startsWith("http")) {
            const urlObj = new URL(response.request.res.responseUrl);
            currentUrl = new URL(currentUrl, urlObj).href;
          }
        } else {
          break;
        }
      } catch (err) {
        break;
      }
    }

    if (
      redirectChain.length === 0 ||
      redirectChain[redirectChain.length - 1].url !== currentUrl
    ) {
      const finalResponse = await axios.get(currentUrl);
      redirectChain.push({
        url: finalResponse.request.res.responseUrl,
        status: finalResponse.status,
      });
    }

    return res.status(200).json({ chain: redirectChain });
  } catch (err) {
    console.error("Error checking redirects:", err);
    let errorMessage = "Failed to check redirects.";
    if (err.response) {
      errorMessage = `Request failed with status code ${err.response.status}.`;
      if (err.response.headers.location) {
        errorMessage += ` Redirected to: ${err.response.headers.location}`;
      }
    } else if (err.request) {
      errorMessage = "No response received from the server.";
    } else {
      errorMessage = err.message;
    }
    return res.status(500).json({ msg: errorMessage });
  }
});

module.exports = router;
