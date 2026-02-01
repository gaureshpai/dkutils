const router = require("express").Router();
const { supabase } = require("../utils/supabaseClient");

const generateRandomString = (sizeInBytes) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < sizeInBytes; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

// @route   POST /api/keep-alive
// @desc    Generate and upload a 1KB text file to Supabase to keep the account alive
// @access  Private (intended for CI/CD or internal use)
router.post("/", async (req, res) => {
  try {
    const fileSizeInBytes = 1024;
    const randomText = generateRandomString(fileSizeInBytes);
    const fileName = `keep-alive-${Date.now()}.txt`;

    const { data, error } = await supabase.storage
      .from("utilityhub")
      .upload(`keep-alive/${fileName}`, randomText, {
        contentType: "text/plain",
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({
        msg: "Failed to upload file to Supabase",
        error: error.message,
      });
    }

    return res
      .status(200)
      .json({ msg: "Keep-alive file uploaded successfully", path: data.path });
  } catch (err) {
    console.error("Server error in keep-alive endpoint:", err);
    return res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
