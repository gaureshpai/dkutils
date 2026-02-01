const router = require("express").Router();
const archiver = require("archiver");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

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
    });
    const imageBuffer = Buffer.from(response.data);

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const zipBuffer = await new Promise((resolve, reject) => {
      const buffers = [];
      archive.on("data", (data) => buffers.push(data));
      archive.on("end", () => resolve(Buffer.concat(buffers)));
      archive.on("error", (err) => reject(err));

      archive.append(imageBuffer, { name: `screenshot-${Date.now()}.png` });
      archive.finalize();
    });

    const zipFileName = `screenshots-${Date.now()}.zip`;
    const { error } = await supabase.storage
      .from("utilityhub")
      .upload(`screenshots/${zipFileName}`, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({
        msg: "Failed to upload screenshot ZIP to Supabase",
        error: error.message,
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from("utilityhub")
      .getPublicUrl(`screenshots/${zipFileName}`);

    return res
      .status(200)
      .json({ path: publicUrlData.publicUrl, originalname: zipFileName });
  } catch (err) {
    console.error("Error generating screenshot:", err);
    return res.status(500).json({
      msg: "Failed to generate screenshot. Please check the URL and API key.",
      error: err.message,
    });
  }
});

module.exports = router;
