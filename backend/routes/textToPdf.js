const router = require("express").Router();
const PDFDocument = require("pdfkit");
const archiver = require("archiver");

// @route   POST /api/convert/text-to-pdf
// @desc    Convert text to PDF and send for direct download
// @access  Public
router.post("/text-to-pdf", async (req, res) => {
  const { text } = req.body;

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

    doc.text(text);
    doc.end();

    const pdfBuffer = await pdfBufferPromise;

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const archiveBuffer = await new Promise((resolve, reject) => {
      const buffers = [];
      archive.on("data", (data) => buffers.push(data));
      archive.on("end", () => resolve(Buffer.concat(buffers)));
      archive.on("error", (err) => reject(err));

      archive.append(pdfBuffer, {
        name: `utilityhub_converted-text-${Date.now()}.pdf`,
      });
      archive.finalize();
    });

    const zipFileName = `utilityhub_text_to_pdf_${Date.now()}.zip`;
    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFileName}"`,
    });
    res.end(archiveBuffer);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
