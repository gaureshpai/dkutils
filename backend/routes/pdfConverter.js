const router = require("express").Router();
const { PDFDocument, degrees } = require("pdf-lib");
const archiver = require("archiver");
const { createClient } = require("@supabase/supabase-js");
const pdfParse = require("pdf-parse");
const {
  handlePdfError,
  validatePdfFile,
  validatePageRange,
} = require("../utils/pdfErrorHandler");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// @route   POST /api/convert/merge-pdfs
// @desc    Merge multiple PDFs into one
// @access  Public
router.post(
  "/merge-pdfs",
  (req, res, next) => req.upload.array("pdfs")(req, res, next),
  async (req, res) => {
    try {
      const { files } = req;

      if (!files || files.length === 0) {
        return res.status(400).json({
          msg: "No files uploaded. Please select at least one PDF file.",
        });
      }

      if (files.length < 2) {
        return res
          .status(400)
          .json({ msg: "Please upload at least 2 PDF files to merge." });
      }

      // Validate all files
      files.forEach((file, index) => {
        try {
          validatePdfFile(file);
        } catch (err) {
          throw new Error(
            `File ${index + 1} (${file.originalname}): ${err.message}`,
          );
        }
      });

      const PDFMerger = (await import("pdf-merger-js")).default;
      const merger = new PDFMerger();

      try {
        await Promise.all(files.map((file) => merger.add(file.buffer)));
      } catch (err) {
        throw new Error(
          "Failed to merge PDFs. One or more files may be corrupted or password-protected.",
        );
      }

      const mergedPdfBuffer = await merger.saveAsBuffer();

      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      const archiveBuffer = await new Promise((resolve, reject) => {
        const buffers = [];
        archive.on("data", (data) => buffers.push(data));
        archive.on("end", () => resolve(Buffer.concat(buffers)));
        archive.on("error", (err) => reject(err));

        archive.append(mergedPdfBuffer, {
          name: `dkutils_merged-${Date.now()}.pdf`,
        });
        archive.finalize();
      });

      const zipFileName = `dkutils_merged_pdf_${Date.now()}.zip`;
      const { error: uploadError } = await supabase.storage
        .from("utilityhub")
        .upload(zipFileName, archiveBuffer, {
          contentType: "application/zip",
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw new Error(
          "Failed to upload merged PDF to storage. Please try again.",
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(zipFileName);

      return res.json({
        path: publicUrlData.publicUrl,
        originalname: zipFileName,
        success: true,
        message: "PDFs merged successfully!",
      });
    } catch (err) {
      const errorInfo = handlePdfError(err, "PDF merge");
      return res.status(errorInfo.statusCode).json({
        msg: errorInfo.message,
        error: errorInfo.originalError,
      });
    }
  },
);

// @route   POST /api/convert/split-pdf
// @desc    Split a PDF into multiple pages
// @access  Public
router.post(
  "/split-pdf",
  (req, res, next) => req.upload.single("pdf")(req, res, next),
  async (req, res) => {
    try {
      const { ranges } = req.body;
      const { file } = req;

      validatePdfFile(file);

      if (!ranges) {
        return res.status(400).json({ msg: "No page ranges provided." });
      }

      const existingPdfBytes = file.buffer;
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(existingPdfBytes);
      } catch (err) {
        throw new Error(
          "Failed to load PDF. The file may be corrupted or password protected.",
        );
      }

      const totalPages = pdfDoc.getPageCount();

      const newPdfDoc = await PDFDocument.create();

      const pageNumbers = validatePageRange(ranges, totalPages);

      const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageNumbers);
      for (const page of copiedPages) {
        newPdfDoc.addPage(page);
      }

      const newPdfBytes = await newPdfDoc.save();

      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      const archiveBuffer = await new Promise((resolve, reject) => {
        const buffers = [];
        archive.on("data", (data) => buffers.push(data));
        archive.on("end", () => resolve(Buffer.concat(buffers)));
        archive.on("error", (err) => reject(err));

        archive.append(Buffer.from(newPdfBytes), {
          name: `dkutils_split-${Date.now()}.pdf`,
        });
        archive.finalize();
      });

      const zipFileName = `dkutils_split_pdf_${Date.now()}.zip`;
      const { error: uploadError } = await supabase.storage
        .from("utilityhub")
        .upload(zipFileName, archiveBuffer, {
          contentType: "application/zip",
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw new Error("Failed to upload split PDF to storage.");
      }

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(zipFileName);

      return res.json({
        path: publicUrlData.publicUrl,
        originalname: zipFileName,
        success: true,
        message: "PDF split successfully!",
      });
    } catch (err) {
      const errorInfo = handlePdfError(err, "PDF split");
      return res.status(errorInfo.statusCode).json({
        msg: errorInfo.message,
        error: errorInfo.originalError,
      });
    }
  },
);

// @route   POST /api/convert/pdf-to-text
// @desc    Convert PDF to text
// @access  Public
router.post(
  "/pdf-to-text",
  (req, res, next) => req.upload.single("pdf")(req, res, next),
  async (req, res) => {
    try {
      const { file } = req;
      validatePdfFile(file);

      const pdfBuffer = file.buffer;
      let data;
      try {
        data = await pdfParse(pdfBuffer);
      } catch (err) {
        throw new Error(
          "Failed to parse PDF text. The file might be scanned (image-only) or corrupted.",
        );
      }

      const extractedText = data.text;

      if (!extractedText || extractedText.trim().length === 0) {
        return res
          .status(200)
          .send(
            "No text could be extracted. The PDF might contain only images.",
          );
      }

      return res.send(extractedText);
    } catch (err) {
      const errorInfo = handlePdfError(err, "PDF to Text");
      return res.status(errorInfo.statusCode).json({ msg: errorInfo.message });
    }
  },
);

// @route   POST /api/convert/pdf-rotate
// @desc    Rotate pages in a PDF
// @access  Public
router.post(
  "/pdf-rotate",
  (req, res, next) => req.upload.single("pdf")(req, res, next),
  async (req, res) => {
    try {
      const { file } = req;
      const { angle } = req.body;

      validatePdfFile(file);

      if (!angle || ![90, 180, 270].includes(Number(angle))) {
        return res
          .status(400)
          .json({ msg: "Invalid rotation angle. Must be 90, 180, or 270." });
      }

      const pdfBuffer = file.buffer;
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(pdfBuffer);
      } catch (err) {
        throw new Error("Failed to load PDF.");
      }

      pdfDoc.getPages().forEach((page) => {
        page.setRotation(degrees(Number(angle)));
      });

      const modifiedPdfBytes = await pdfDoc.save();

      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      const archiveBuffer = await new Promise((resolve, reject) => {
        const buffers = [];
        archive.on("data", (data) => buffers.push(data));
        archive.on("end", () => resolve(Buffer.concat(buffers)));
        archive.on("error", (err) => reject(err));

        archive.append(Buffer.from(modifiedPdfBytes), {
          name: `dkutils_rotated-${Date.now()}.pdf`,
        });
        archive.finalize();
      });

      const zipFileName = `dkutils_rotated_pdf_${Date.now()}.zip`;
      const { error: uploadError } = await supabase.storage
        .from("utilityhub")
        .upload(zipFileName, archiveBuffer, {
          contentType: "application/zip",
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw new Error("Failed to upload rotated PDF.");
      }

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(zipFileName);

      return res.json({
        path: publicUrlData.publicUrl,
        originalname: zipFileName,
        success: true,
        message: "PDF rotated successfully!",
      });
    } catch (err) {
      const errorInfo = handlePdfError(err, "PDF Rotation");
      return res.status(errorInfo.statusCode).json({
        msg: errorInfo.message,
        error: errorInfo.originalError,
      });
    }
  },
);

// @route   POST /api/convert/compress-pdf
// @desc    Compress a PDF file
// @access  Public
router.post(
  "/compress-pdf",
  (req, res, next) => req.upload.single("pdf")(req, res, next),
  async (req, res) => {
    try {
      const { file } = req;
      validatePdfFile(file);

      const pdfBuffer = file.buffer;
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(pdfBuffer);
      } catch (err) {
        throw new Error("Failed to load PDF.");
      }

      // In pdf-lib, saving is where some "compression" (reorganization) happens
      // For specialized compression, we might need a different library,
      // but this aligns with the original implementation's intent.
      const compressedPdfBytes = await pdfDoc.save();

      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      const archiveBuffer = await new Promise((resolve, reject) => {
        const buffers = [];
        archive.on("data", (data) => buffers.push(data));
        archive.on("end", () => resolve(Buffer.concat(buffers)));
        archive.on("error", (err) => reject(err));

        archive.append(Buffer.from(compressedPdfBytes), {
          name: `dkutils_compressed-${Date.now()}.pdf`,
        });
        archive.finalize();
      });

      const zipFileName = `dkutils_compressed_pdf_${Date.now()}.zip`;
      const { error: uploadError } = await supabase.storage
        .from("utilityhub")
        .upload(zipFileName, archiveBuffer, {
          contentType: "application/zip",
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw new Error("Failed to upload compressed PDF.");
      }

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(zipFileName);

      return res.json({
        path: publicUrlData.publicUrl,
        originalname: zipFileName,
        success: true,
        message: "PDF compressed successfully!",
      });
    } catch (err) {
      const errorInfo = handlePdfError(err, "PDF Compression");
      return res.status(errorInfo.statusCode).json({
        msg: errorInfo.message,
        error: errorInfo.originalError,
      });
    }
  },
);

module.exports = router;
