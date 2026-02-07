const router = require("express").Router();
const PDFDocument = require("pdfkit");

// @route   POST /api/convert/text-to-pdf
// @desc    Convert text to PDF and send for direct download
// @access  Public
router.post("/text-to-pdf", async (req, res) => {
  const { text } = req.body;

  // Validate input: ensure text is a non-empty string
  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({
      msg: "Text is required and must be a non-empty string",
    });
  }

  const trimmedText = text.trim();

  try {
    const doc = new PDFDocument();
    const pdfBufferPromise = new Promise((resolve, reject) => {
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on("error", reject);
    });

    doc.text(trimmedText);
    doc.end();

    const pdfBuffer = await pdfBufferPromise;

    const outputFileName = `dkutils_converted-text-${Date.now()}.pdf`;
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${outputFileName}"`,
    });
    res.end(pdfBuffer);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
