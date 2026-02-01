const router = require("express").Router();
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const archiver = require("archiver");
const { createClient } = require("@supabase/supabase-js");
const dns = require("dns");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Function to check if IP is private/reserved
const isPrivateIP = (ip) => {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
  ];

  return privateRanges.some((range) => range.test(ip));
};

// Function to validate URL and check for private IPs
const validateUrl = async (url) => {
  try {
    const urlObj = new URL(url);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      throw new Error("Only HTTP and HTTPS protocols are allowed");
    }

    // Extract hostname and resolve to check IP addresses
    const hostname = urlObj.hostname;
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4(hostname, (err, addresses) => {
        if (err) {
          dns.resolve6(hostname, (err6, addresses6) => {
            if (err6) resolve([]);
            else resolve(addresses6);
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
    throw new Error(`URL validation failed: ${error.message}`);
  }
};

const downloadFile = async (fileUrl) => {
  try {
    // Validate the URL before making the request
    await validateUrl(fileUrl);

    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      maxRedirects: 0, // Disable redirects to prevent SSRF chains
      timeout: 5000,
    });
    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers["content-type"],
    };
  } catch (error) {
    console.error(`Failed to download file from ${fileUrl}:`, error.message);
    return null;
  }
};

// @route   POST /api/favicon
// @desc    Extract favicons from a given URL and upload to Supabase as a ZIP
// @access  Public
router.post("/", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ msg: "URL is required" });
  }

  try {
    // Validate the main URL before processing
    await validateUrl(url);

    const response = await axios.get(url, {
      maxRedirects: 0, // Disable redirects to prevent SSRF chains
      timeout: 5000,
    });
    const $ = cheerio.load(response.data);
    const faviconUrls = [];

    $(
      'link[rel~="icon"], link[rel~="shortcut icon"], link[rel~="apple-touch-icon"]',
    ).each((i, el) => {
      let href = $(el).attr("href");
      if (href) {
        if (href.startsWith("//")) {
          href = `https:${href}`;
        } else if (href.startsWith("/")) {
          const urlObj = new URL(url);
          href = `${urlObj.protocol}//${urlObj.host}${href}`;
        } else if (!href.startsWith("http")) {
          const urlObj = new URL(url);
          href = `${urlObj.href.substring(0, urlObj.href.lastIndexOf("/") + 1)}${href}`;
        }
        faviconUrls.push(href);
      }
    });

    const urlObj = new URL(url);
    const defaultFavicon = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
    if (!faviconUrls.includes(defaultFavicon)) {
      faviconUrls.push(defaultFavicon);
    }

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const zipBuffer = await new Promise((resolve, reject) => {
      const buffers = [];
      archive.on("data", (data) => buffers.push(data));
      archive.on("end", () => resolve(Buffer.concat(buffers)));
      archive.on("error", (err) => reject(err));

      const downloadPromises = faviconUrls.map(async (faviconUrl) => {
        const fileData = await downloadFile(faviconUrl);
        if (fileData && fileData.buffer) {
          const fileName = `favicon-${path.basename(new URL(faviconUrl).pathname || "default.ico")}`;
          archive.append(fileData.buffer, { name: fileName });
        }
      });

      Promise.all(downloadPromises)
        .then(() => archive.finalize())
        .catch((err) => reject(err));
    });

    const zipFileName = `favicons-${Date.now()}.zip`;
    const { error } = await supabase.storage
      .from("utilityhub")
      .upload(`favicons/${zipFileName}`, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({
        msg: "Failed to upload favicon ZIP to Supabase",
        error: error.message,
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from("utilityhub")
      .getPublicUrl(`favicons/${zipFileName}`);

    return res
      .status(200)
      .json({ path: publicUrlData.publicUrl, originalname: zipFileName });
  } catch (err) {
    console.error("Error extracting favicons:", err);
    return res.status(500).json({
      msg: "Failed to extract favicons. Please check the URL.",
      error: err.message,
    });
  }
});

module.exports = router;
