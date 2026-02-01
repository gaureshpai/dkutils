const router = require("express").Router();
const axios = require("axios");
const dns = require("dns");
const { isPrivateIP } = require("../utils/ipValidation");

// Function to validate domain and resolve to check for private IPs
const validateDomain = async (domain) => {
  try {
    // Basic domain format validation
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      throw new Error("Invalid domain format");
    }

    // Resolve DNS to check IP addresses
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4(domain, (err, addresses) => {
        if (err) {
          dns.resolve6(domain, (err6, addresses6) => {
            if (err6) {
              // Both IPv4 and IPv6 lookups failed - reject instead of resolving to empty array
              reject(new Error(`DNS resolution failed: ${err.message}`));
            } else {
              resolve(addresses6);
            }
          });
        } else {
          resolve(addresses);
        }
      });
    });

    // Check if any resolved IP is private
    for (const ip of addresses) {
      if (isPrivateIP(ip)) {
        throw new Error("Private IP ranges not allowed");
      }
    }

    return true;
  } catch (error) {
    throw new Error(`Domain validation failed: ${error.message}`);
  }
};

const fetchContent = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      maxRedirects: 0, // Disable redirects to prevent SSRF chains
      validateStatus: (status) => status < 400,
    });
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

  try {
    await validateDomain(domain);
  } catch (error) {
    return res.status(400).json({ msg: error.message });
  }

  const url = `http://${domain}/robots.txt`;
  const httpsUrl = `https://${domain}/robots.txt`;

  let result = await fetchContent(httpsUrl);
  // Fallback to HTTP if HTTPS fails with 404 or redirect-related errors
  if (
    !result.exists &&
    (result.error === "File not found (404)" ||
      result.error?.includes("redirect") ||
      result.error?.includes("302") ||
      result.error?.includes("301"))
  ) {
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

  try {
    await validateDomain(domain);
  } catch (error) {
    return res.status(400).json({ msg: error.message });
  }

  const url = `http://${domain}/sitemap.xml`;
  const httpsUrl = `https://${domain}/sitemap.xml`;

  let result = await fetchContent(httpsUrl);
  // Fallback to HTTP if HTTPS fails with 404 or redirect-related errors
  if (
    !result.exists &&
    (result.error === "File not found (404)" ||
      result.error?.includes("redirect") ||
      result.error?.includes("302") ||
      result.error?.includes("301"))
  ) {
    result = await fetchContent(url);
  }

  return res.status(200).json(result);
});

module.exports = router;
