const router = require("express").Router();
const pdf = require("pdf-parse");
const { Document, Packer, Paragraph, TextRun } = require("docx");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// @route   POST /api/convert/pdf-to-word
// @desc    Convert PDF to Word (Text Extraction)
// @access  Public
router.post(
  "/pdf-to-word",
  (req, res, next) => req.upload.single("pdf")(req, res, next),
  async (req, res) => {
    try {
      const { file } = req;
      console.log(
        "PDF to Word (text extraction) conversion requested for:",
        file.originalname,
      );

      if (!file) {
        return res.status(400).json({ msg: "No PDF file uploaded." });
      }

      const pdfBuffer = file.buffer;

      const data = await pdf(pdfBuffer);
      let extractedText = data.text;

      extractedText = extractedText.replace(/\./g, ".\n");
      extractedText = extractedText.replace(/\n\s*\n/g, "\n");
      extractedText = extractedText.replace(/\. \n/g, ".\n");

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: extractedText.split("\n").map(
              (line) =>
                new Paragraph({
                  children: [new TextRun(line)],
                }),
            ),
          },
        ],
      });

      const docxBuffer = await Packer.toBuffer(doc);

      const fileName = `dkutils_converted-${Date.now()}.docx`;
      const { error: uploadError } = await supabase.storage
        .from("utilityhub")
        .upload(fileName, docxBuffer, {
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(fileName);

      return res.json({
        path: publicUrlData.publicUrl,
        originalname: fileName,
      });
    } catch (err) {
      console.error(
        "Error during PDF to Word (text extraction) conversion:",
        err,
      );
      return res.status(500).json({ msg: "Server Error" });
    }
  },
);

// @route   POST /api/convert/pdf-to-excel
// @desc    Convert PDF to Excel (Text Extraction)
// @access  Public
router.post(
  "/pdf-to-excel",
  (req, res, next) => req.upload.single("pdf")(req, res, next),
  async (req, res) => {
    try {
      const { file } = req;
      console.log(
        "PDF to Excel (text extraction) conversion requested for:",
        file.originalname,
      );

      if (!file) {
        return res.status(400).json({ msg: "No PDF file uploaded." });
      }

      const pdfBuffer = file.buffer;

      const data = await pdf(pdfBuffer);
      const extractedText = data.text;

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([[extractedText]]);

      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const fileName = `dkutils_converted-${Date.now()}.xlsx`;
      const { error: uploadError } = await supabase.storage
        .from("utilityhub")
        .upload(fileName, excelBuffer, {
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(fileName);

      return res.json({
        path: publicUrlData.publicUrl,
        originalname: fileName,
      });
    } catch (err) {
      console.error(
        "Error during PDF to Excel (text extraction) conversion:",
        err,
      );
      return res.status(500).json({ msg: "Server Error" });
    }
  },
);

module.exports = router;
