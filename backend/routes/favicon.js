const router = require("express").Router();
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const archiver = require("archiver");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const downloadFile = async (fileUrl) => {
  try {
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
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
    const response = await axios.get(url);
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
