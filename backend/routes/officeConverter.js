const router = require("express").Router();
const path = require("node:path");
const pdf = require("pdf-parse");
const { Document, Packer, Paragraph, TextRun } = require("docx");
const XLSX = require("xlsx");
const { supabase } = require("@backend/utils/supabaseClient");
const { sanitizeFilename } = require("@backend/utils/filenameSanitizer");

// @route   POST /api/convert/pdf-to-word
// @desc    Convert PDF to Word (Text Extraction)
// @access  Public
router.post(
	"/pdf-to-word",
	(req, res, next) => req.upload.single("pdf")(req, res, next),
	async (req, res) => {
		try {
			const { file } = req;
			if (!file) {
				return res.status(400).json({ msg: "No PDF file uploaded." });
			}

			// Validate file is a PDF
			if (file.mimetype !== "application/pdf") {
				return res.status(400).json({ msg: "Uploaded file must be a PDF." });
			}

			/**
			 * Splits a given text into sentences.
			 *
			 * This function first normalizes the input text by replacing all
			 * occurrences of "\r\n" with "\n", and then replaces all occurrences
			 * of "\n\s*\n+" with "\n". It then proceeds to replace all URLs
			 * with tokens of the form "__URL_<number>__", and replaces all
			 * abbreviations with their "safe" equivalents (i.e. all periods
			 * are replaced with "∯"). Finally, the function splits the text on
			 * sentence boundaries (i.e. on periods, question marks, and
			 * exclamation marks) and returns the resulting sentences as an array.
			 *
			 * @param {string} text The text to be split into sentences.
			 * @returns {string[]} An array of sentences.
			 */
			const splitTextIntoSentences = (text) => {
				if (!text || typeof text !== "string") return [];

				let normalized = text.replace(/\r\n/g, "\n");
				normalized = normalized.replace(/\n\s*\n+/g, "\n");

				const urlTokens = [];
				normalized = normalized.replace(/https?:\/\/\S+/g, (match) => {
					urlTokens.push(match);
					return `__URL_${urlTokens.length - 1}__`;
				});

				const abbreviations = [
					"Mr.",
					"Mrs.",
					"Ms.",
					"Dr.",
					"Prof.",
					"Sr.",
					"Jr.",
					"St.",
					"vs.",
					"etc.",
					"e.g.",
					"i.e.",
				];

				for (const abbr of abbreviations) {
					const safe = abbr.replace(/\./g, "∯");
					normalized = normalized.replaceAll(abbr, safe);
				}

				const parts = normalized
					.replace(/\s+/g, " ")
					.trim()
					.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);

				return parts
					.map((p) => p.replace(/∯/g, "."))
					.map((p) => p.replace(/__URL_(\d+)__/g, (_, idx) => urlTokens[Number(idx)]))
					.filter((p) => p.trim().length > 0);
			};

			const data = await pdf(file.buffer);
			const extractedText = data.text;

			if (!extractedText || extractedText.trim().length === 0) {
				return res
					.status(200)
					.json({ msg: "No text could be extracted. The PDF might contain only images." });
			}

			const processedText = splitTextIntoSentences(extractedText).join("\n");

			const doc = new Document({
				sections: [
					{
						properties: {},
						children: processedText.split("\n").map(
							(line) =>
								new Paragraph({
									children: [new TextRun(line)],
								}),
						),
					},
				],
			});

			const docxBuffer = await Packer.toBuffer(doc);

			const sanitizedName = sanitizeFilename(file.originalname);
			const nameWithoutExt = path.parse(sanitizedName).name;
			const fileName = `dkutils_${nameWithoutExt}_converted_${Date.now()}.docx`;
			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(fileName, docxBuffer, {
					contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				});

			if (uploadError) {
				throw uploadError;
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(fileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: fileName,
			});
		} catch (err) {
			console.error("Error during PDF to Word (text extraction) conversion:", err);
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
			if (!file) {
				return res.status(400).json({ msg: "No PDF file uploaded." });
			}

			// Validate file is a PDF
			if (file.mimetype !== "application/pdf") {
				return res.status(400).json({ msg: "Uploaded file must be a PDF." });
			}

			const data = await pdf(file.buffer);
			const extractedText = data.text;

			if (!extractedText || extractedText.trim().length === 0) {
				return res
					.status(200)
					.json({ msg: "No text could be extracted. The PDF might contain only images." });
			}

			// Split text into lines and create proper Excel structure
			const lines = extractedText.split("\n").filter((line) => line.trim());
			const rows = lines.map((line) => [line.trim()]);

			const wb = XLSX.utils.book_new();
			const ws = XLSX.utils.aoa_to_sheet(rows);

			XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

			const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

			const sanitizedName = sanitizeFilename(file.originalname);
			const nameWithoutExt = path.parse(sanitizedName).name;
			const fileName = `dkutils_${nameWithoutExt}_converted_${Date.now()}.xlsx`;
			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(fileName, excelBuffer, {
					contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				});

			if (uploadError) {
				throw uploadError;
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(fileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: fileName,
			});
		} catch (err) {
			console.error("Error during PDF to Excel (text extraction) conversion:", err);
			return res.status(500).json({ msg: "Server Error" });
		}
	},
);

module.exports = router;
