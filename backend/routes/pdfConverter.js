const router = require("express").Router();
const path = require("node:path");
const { PDFDocument, degrees } = require("pdf-lib");
const { supabase } = require("../utils/supabaseClient");
const pdfParse = require("pdf-parse");
const { handlePdfError, validatePdfFile, validatePageRange } = require("../utils/pdfErrorHandler");
const { sanitizeFilename } = require("../utils/filenameSanitizer");

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
				return res.status(400).json({ msg: "Please upload at least 2 PDF files to merge." });
			}

			// Validate all files
			files.forEach((file, index) => {
				try {
					validatePdfFile(file);
				} catch (err) {
					throw new Error(`File ${index + 1} (${file.originalname}): ${err.message}`);
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

			const outputFileName = `merged_dkutils_${Date.now()}.pdf`;
			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(outputFileName, mergedPdfBuffer, {
					contentType: "application/pdf",
				});

			if (uploadError) {
				console.error("Supabase upload error:", uploadError);
				throw new Error("Failed to upload merged PDF to storage. Please try again.");
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: outputFileName,
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
				throw new Error("Failed to load PDF. The file may be corrupted or password protected.");
			}

			const totalPages = pdfDoc.getPageCount();

			const newPdfDoc = await PDFDocument.create();

			const pageNumbers = validatePageRange(ranges, totalPages);

			const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageNumbers);
			for (const page of copiedPages) {
				newPdfDoc.addPage(page);
			}

			const newPdfBytes = await newPdfDoc.save();

			const sanitizedName = sanitizeFilename(file.originalname);
			const nameWithoutExt = path.parse(sanitizedName).name;
			const outputFileName = `${nameWithoutExt}_dkutils_split_${Date.now()}.pdf`;
			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(outputFileName, Buffer.from(newPdfBytes), {
					contentType: "application/pdf",
				});

			if (uploadError) {
				console.error("Supabase upload error:", uploadError);
				throw new Error("Failed to upload split PDF to storage.");
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: outputFileName,
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

			res.type("text/plain");
			if (!extractedText || extractedText.trim().length === 0) {
				return res
					.status(200)
					.send("No text could be extracted. The PDF might contain only images.");
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
				return res.status(400).json({ msg: "Invalid rotation angle. Must be 90, 180, or 270." });
			}

			const pdfBuffer = file.buffer;
			let pdfDoc;
			try {
				pdfDoc = await PDFDocument.load(pdfBuffer);
			} catch (err) {
				throw new Error("Failed to load PDF.");
			}

			for (const page of pdfDoc.getPages()) {
				const currentRotation = page.getRotation().angle;
				const newRotation = (currentRotation + Number(angle)) % 360;
				page.setRotation(degrees(newRotation));
			}

			const modifiedPdfBytes = await pdfDoc.save();

			const sanitizedName = sanitizeFilename(file.originalname);
			const nameWithoutExt = path.parse(sanitizedName).name;
			const outputFileName = `${nameWithoutExt}_dkutils_rotated_${Date.now()}.pdf`;
			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(outputFileName, Buffer.from(modifiedPdfBytes), {
					contentType: "application/pdf",
				});

			if (uploadError) {
				console.error("Supabase upload error:", uploadError);
				throw new Error("Failed to upload rotated PDF.");
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: outputFileName,
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
			const { compressionLevel = "medium" } = req.body;

			if (!["low", "medium", "high"].includes(compressionLevel)) {
				return res.status(400).json({
					msg: "Invalid compression level. Please choose low, medium, or high.",
				});
			}

			validatePdfFile(file);

			const pdfBuffer = file.buffer;
			let pdfDoc;
			try {
				pdfDoc = await PDFDocument.load(pdfBuffer);
			} catch (err) {
				throw new Error("Failed to load PDF.");
			}

			// Get original file size for comparison
			const originalSize = pdfBuffer.length;

			// Configure compression based on level
			// Note: pdf-lib only supports useObjectStreams, objectsPerTick, and updateFieldAppearances
			// There is no general "compress" flag - compression comes from using object streams
			const compressionOptions = {
				updateFieldAppearances: false,
			};

			switch (compressionLevel) {
				case "low":
					compressionOptions.useObjectStreams = false;
					break;
				case "medium":
					compressionOptions.useObjectStreams = true;
					break;
				case "high":
					compressionOptions.useObjectStreams = true;
					compressionOptions.objectsPerTick = 50;
					break;
			}

			// Save with compression options that preserve content
			const compressedPdfBytes = await pdfDoc.save(compressionOptions);

			const compressedSize = compressedPdfBytes.length;
			const compressionRatio =
				originalSize > 0 ? ((originalSize - compressedSize) / originalSize) * 100 : 0;

			const absoluteRatio = Math.abs(compressionRatio).toFixed(2);
			const directionVerb = compressionRatio >= 0 ? "Reduced" : "Increased";

			console.log(
				`PDF compression: ${originalSize} bytes -> ${compressedSize} bytes (${directionVerb} by ${absoluteRatio}%)`,
			);

			// Compress PDF
			const sanitizedName = sanitizeFilename(file.originalname);
			const nameWithoutExt = path.parse(sanitizedName).name;
			const outputFileName = `${nameWithoutExt}_dkutils_compressed_${Date.now()}.pdf`;
			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(outputFileName, Buffer.from(compressedPdfBytes), {
					contentType: "application/pdf",
				});

			if (uploadError) {
				console.error("Supabase upload error:", uploadError);
				throw new Error("Failed to upload compressed PDF.");
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

			res.status(200).json({
				path: downloadUrl,
				originalname: outputFileName,
				success: true,
				message: `PDF compressed successfully with ${compressionLevel} compression! ${directionVerb} by ${absoluteRatio}%`,
				compressionRatio,
				compressionLevel,
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
