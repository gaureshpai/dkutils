const PDFDocument = require("pdfkit");
const router = require("express").Router();
const archiver = require("archiver");
const { createJimp, defaultFormats, defaultPlugins } = require("jimp");
const webp = require("@jimp/wasm-webp");
const avif = require("@jimp/wasm-avif");
const path = require("node:path");
const os = require("node:os");
const fsp = require("node:fs").promises;
const { supabase } = require("../utils/supabaseClient");
const { sanitizeFilename } = require("../utils/filenameSanitizer");

// Create a custom Jimp instance with WASM plugins
const Jimp = createJimp({
	formats: [...defaultFormats, webp, avif],
	plugins: defaultPlugins,
});

// @route   POST /api/convert/png-to-jpg
// @desc    Convert PNG images to JPG
// @access  Public
router.post(
	"/png-to-jpg",
	(req, res, next) => req.upload.array("images")(req, res, next),
	async (req, res) => {
		try {
			const { files } = req;
			if (!files || files.length === 0) {
				return res.status(400).json({ msg: "No image files uploaded." });
			}

			if (files.length === 1) {
				const file = files[0];
				const imageBuffer = file.buffer;
				const { originalname } = file;
				const sanitizedName = sanitizeFilename(originalname);
				const nameWithoutExt = path.parse(sanitizedName).name;

				const image = await Jimp.read({ data: imageBuffer });
				const jpgBuffer = await image.getBuffer("image/jpeg");
				const outputFileName = `${nameWithoutExt}_dkutils_converted_${Date.now()}.jpg`;

				const { error: uploadError } = await supabase.storage
					.from("utilityhub")
					.upload(outputFileName, jpgBuffer, {
						contentType: "image/jpeg",
					});

				if (uploadError) {
					throw uploadError;
				}

				const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

				return res.json({
					path: downloadUrl,
					originalname: outputFileName,
				});
			}

			const archive = archiver("zip", {
				zlib: { level: 9 },
			});

			const archiveBuffer = await new Promise((resolve, reject) => {
				const buffers = [];
				archive.on("data", (data) => buffers.push(data));
				archive.on("end", () => resolve(Buffer.concat(buffers)));
				archive.on("error", (err) => reject(err));

				const conversionPromises = files.map(async (file) => {
					const imageBuffer = file.buffer;
					const { originalname } = file;
					const sanitizedName = sanitizeFilename(originalname);
					const nameWithoutExt = path.parse(sanitizedName).name;

					const image = await Jimp.read({ data: imageBuffer });
					const jpgBuffer = await image.getBuffer("image/jpeg");

					archive.append(jpgBuffer, {
						name: `${nameWithoutExt}_dkutils_converted.jpg`,
					});
				});

				Promise.all(conversionPromises)
					.then(() => archive.finalize())
					.catch((err) => reject(err));
			});

			const zipFileName = `dkutils_converted_png_to_jpg_${Date.now()}.zip`;
			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(zipFileName, archiveBuffer, {
					contentType: "application/zip",
				});

			if (uploadError) {
				throw uploadError;
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(zipFileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: zipFileName,
			});
		} catch (err) {
			console.error(err);
			console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
			return res.status(500).json({ msg: "Server Error" });
		}
	},
);

// @route   GET /api/convert/download
// @desc    Download a converted file with forced attachment
// @access  Public
router.get("/download", async (req, res) => {
	try {
		const { filename } = req.query;
		if (!filename) {
			return res.status(400).json({ msg: "Filename is required." });
		}

		const allowedPrefixes = [
			"dkutils_",
			"dkutils-",
			"screenshot-",
			"screenshots/screenshot-",
			"favicons/",
		];
		if (
			filename.includes("..") ||
			(!allowedPrefixes.some((prefix) => filename.startsWith(prefix)) &&
				!filename.includes("_dkutils_"))
		) {
			return res.status(403).json({ msg: "Invalid filename." });
		}

		const { data, error } = await supabase.storage.from("utilityhub").download(filename);

		if (error) {
			throw error;
		}

		const baseName = path.basename(filename);
		const arrayBuffer = await data.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Sanitize filename to prevent header injection
		const sanitizedBaseName = baseName
			.replace(/["\\]/g, "_")
			.replace(new RegExp(/[\x\00-\x\1f\x7f]/g, ""));
		const encodedFilename = encodeURIComponent(baseName);

		res.set("Content-Type", data.type || "application/octet-stream");
		res.set(
			"Content-Disposition",
			`attachment; filename="${sanitizedBaseName}"; filename*=UTF-8''${encodedFilename}`,
		);
		return res.send(buffer);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ msg: "Server Error" });
	}
});

// @route   POST /api/convert/image-to-pdf
// @desc    Convert images to PDF
// @access  Public
router.post(
	"/image-to-pdf",
	(req, res, next) => req.upload.array("images")(req, res, next),
	async (req, res) => {
		try {
			const { files } = req;
			if (!files || files.length === 0) {
				return res.status(400).json({ msg: "No image files uploaded." });
			}

			const pdfDoc = new PDFDocument({
				autoFirstPage: false,
			});

			const buffers = [];
			pdfDoc.on("data", buffers.push.bind(buffers));
			const pdfGenerationPromise = new Promise((resolve, reject) => {
				pdfDoc.on("end", () => resolve(Buffer.concat(buffers)));
				pdfDoc.on("error", reject);
			});

			for (const file of files) {
				let tempImagePath = "";
				try {
					const imageBuffer = file.buffer;

					const image = await Jimp.read({ data: imageBuffer });
					const pngBuffer = await image.getBuffer("image/png");

					tempImagePath = path.join(
						os.tmpdir(),
						`temp_image_${Date.now()}_${Math.random().toString(16).slice(2)}.png`,
					);
					await fsp.writeFile(tempImagePath, pngBuffer);

					const imgWidth = image.width;
					const imgHeight = image.height;

					pdfDoc.addPage({ width: imgWidth, height: imgHeight });
					pdfDoc.image(tempImagePath, 0, 0, {
						width: imgWidth,
						height: imgHeight,
					});
				} catch (imageErr) {
					console.error(`Error processing image ${file.originalname}:`, imageErr);
					throw new Error(`Failed to process image ${file.originalname}: ${imageErr.message}`);
				} finally {
					if (tempImagePath) {
						try {
							await fsp.unlink(tempImagePath);
						} catch (unlinkErr) {
							console.error(`Error deleting temp image file ${tempImagePath}:`, unlinkErr);
						}
					}
				}
			}

			pdfDoc.end();
			const pdfBuffer = await pdfGenerationPromise;

			const outputFileName = `dkutils_converted_images_${Date.now()}.pdf`;
			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(outputFileName, pdfBuffer, {
					contentType: "application/pdf",
				});

			if (uploadError) {
				throw uploadError;
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: outputFileName,
			});
		} catch (err) {
			console.error(err);
			console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
			return res.status(500).json({ msg: "Server Error" });
		}
	},
);

// @route   POST /api/convert/resize-image
// @desc    Resize images
// @access  Public
router.post(
	"/resize-image",
	(req, res, next) => req.upload.array("images")(req, res, next),
	async (req, res) => {
		try {
			const { files } = req;
			if (!files || files.length === 0) {
				return res.status(400).json({ msg: "No image files uploaded." });
			}

			const { width, height } = req.body;
			const parsedWidth = Number.parseInt(width, 10);
			const parsedHeight = Number.parseInt(height, 10);

			if (
				Number.isNaN(parsedWidth) ||
				parsedWidth <= 0 ||
				Number.isNaN(parsedHeight) ||
				parsedHeight <= 0
			) {
				return res.status(400).json({
					msg: "Invalid width or height provided. Must be positive numbers.",
				});
			}

			if (files.length === 1) {
				const file = files[0];
				const imageBuffer = file.buffer;
				const { originalname } = file;
				const sanitizedName = sanitizeFilename(originalname);
				const nameWithoutExt = path.parse(sanitizedName).name;

				let outputFormat = "jpeg";
				let extension = "jpg";

				const image = await Jimp.read({ data: imageBuffer });
				if (image.hasAlpha) {
					outputFormat = "png";
					extension = "png";
				}

				image.resize({ width: parsedWidth, height: parsedHeight });
				const mime = `image/${outputFormat}`;
				const resizedBuffer = await image.getBuffer(mime);

				const outputFileName = `${nameWithoutExt}_dkutils_resized_${Date.now()}.${extension}`;
				const { error: uploadError } = await supabase.storage
					.from("utilityhub")
					.upload(outputFileName, resizedBuffer, {
						contentType: `image/${outputFormat}`,
					});

				if (uploadError) {
					throw uploadError;
				}

				const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

				return res.json({
					path: downloadUrl,
					originalname: outputFileName,
				});
			}

			const archive = archiver("zip", {
				zlib: { level: 9 },
			});

			const archiveBuffer = await new Promise((resolve, reject) => {
				const buffers = [];
				archive.on("data", (data) => buffers.push(data));
				archive.on("end", () => resolve(Buffer.concat(buffers)));
				archive.on("error", (err) => reject(err));

				const resizePromises = files.map(async (file) => {
					const imageBuffer = file.buffer;
					const { originalname } = file;
					const sanitizedName = sanitizeFilename(originalname);
					const nameWithoutExt = path.parse(sanitizedName).name;

					let outputFormat = "jpeg";
					let extension = "jpg";

					const image = await Jimp.read({ data: imageBuffer });
					if (image.hasAlpha) {
						outputFormat = "png";
						extension = "png";
					}

					image.resize({ width: parsedWidth, height: parsedHeight });
					const mime = `image/${outputFormat}`;
					const resizedBuffer = await image.getBuffer(mime);

					archive.append(resizedBuffer, {
						name: `${nameWithoutExt}_dkutils_resized.${extension}`,
					});
				});

				Promise.all(resizePromises)
					.then(() => archive.finalize())
					.catch((err) => reject(err));
			});

			const zipFileName = `dkutils_resized_images_${Date.now()}.zip`;
			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(zipFileName, archiveBuffer, {
					contentType: "application/zip",
				});

			if (uploadError) {
				throw uploadError;
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(zipFileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: zipFileName,
			});
		} catch (err) {
			console.error(err);
			console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
			return res.status(500).json({ msg: "Server Error" });
		}
	},
);

// @route   POST /api/convert/compress-image
// @desc    Compress images
// @access  Public
router.post(
	"/compress-image",
	(req, res, next) => req.upload.array("images")(req, res, next),
	async (req, res) => {
		try {
			const { files } = req;
			if (!files || files.length === 0) {
				return res.status(400).json({ msg: "No image files uploaded for compression." });
			}

			const { quality } = req.body;
			const parsedQuality = Number.parseInt(quality, 10);

			if (Number.isNaN(parsedQuality) || parsedQuality < 0 || parsedQuality > 100) {
				return res.status(400).json({
					msg: "Invalid quality provided. Must be a number between 0 and 100.",
				});
			}

			if (files.length === 1) {
				const file = files[0];
				const imageBuffer = file.buffer;
				const { originalname } = file;
				const sanitizedName = sanitizeFilename(originalname);
				const nameWithoutExt = path.parse(sanitizedName).name;

				let compressedBuffer;
				let extension;
				let contentType;

				try {
					const image = await Jimp.read({ data: imageBuffer });
					const format = image.mime.split("/")[1];
					extension = format === "jpeg" ? "jpg" : format;
					contentType = image.mime;

					compressedBuffer = await image.getBuffer(image.mime, {
						quality: parsedQuality,
					});
				} catch (error) {
					const image = await Jimp.read({ data: imageBuffer });
					compressedBuffer = await image.getBuffer("image/jpeg", {
						quality: parsedQuality,
					});
					extension = "jpg";
					contentType = "image/jpeg";
				}

				const outputFileName = `${nameWithoutExt}_dkutils_compressed_${Date.now()}.${extension}`;
				const { error: uploadError } = await supabase.storage
					.from("utilityhub")
					.upload(outputFileName, compressedBuffer, {
						contentType,
					});

				if (uploadError) {
					throw uploadError;
				}

				const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

				return res.json({
					path: downloadUrl,
					originalname: outputFileName,
				});
			}

			const archive = archiver("zip", {
				zlib: { level: 9 },
			});

			const archiveBuffer = await new Promise((resolve, reject) => {
				const buffers = [];
				archive.on("data", (data) => buffers.push(data));
				archive.on("end", () => resolve(Buffer.concat(buffers)));
				archive.on("error", (err) => reject(err));

				const compressionPromises = files.map(async (file) => {
					const imageBuffer = file.buffer;
					const { originalname } = file;
					const sanitizedName = sanitizeFilename(originalname);
					const nameWithoutExt = path.parse(sanitizedName).name;

					let compressedBuffer;
					let extension;

					try {
						const image = await Jimp.read({ data: imageBuffer });
						const format = image.mime.split("/")[1];
						extension = format === "jpeg" ? "jpg" : format;

						compressedBuffer = await image.getBuffer(image.mime, {
							quality: parsedQuality,
						});
					} catch (error) {
						const image = await Jimp.read({ data: imageBuffer });
						compressedBuffer = await image.getBuffer("image/jpeg", {
							quality: parsedQuality,
						});
						extension = "jpg";
					}

					archive.append(compressedBuffer, {
						name: `${nameWithoutExt}_dkutils_compressed.${extension}`,
					});
				});

				Promise.all(compressionPromises)
					.then(() => archive.finalize())
					.catch((err) => reject(err));
			});

			const zipFileName = `dkutils_compressed_images_${Date.now()}.zip`;
			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(zipFileName, archiveBuffer, {
					contentType: "application/zip",
				});

			if (uploadError) {
				throw uploadError;
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(zipFileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: zipFileName,
			});
		} catch (err) {
			console.error(err);
			console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
			return res.status(500).json({ msg: "Server Error" });
		}
	},
);

// @route   POST /api/convert/convert-image-format
// @desc    Convert image format
// @access  Public
router.post(
	"/convert-image-format",
	(req, res, next) => req.upload.array("images")(req, res, next),
	async (req, res) => {
		try {
			const { files } = req;
			if (!files || files.length === 0) {
				return res.status(400).json({ msg: "No image files uploaded." });
			}

			const { format } = req.body;
			const allowedFormats = ["jpeg", "png", "webp", "tiff", "gif", "avif"];
			const normalizedFormat = format ? format.toLowerCase().trim() : "";

			if (!normalizedFormat || !allowedFormats.includes(normalizedFormat)) {
				return res.status(400).json({
					msg: `Invalid format provided. Allowed formats are: ${allowedFormats.join(", ")}`,
				});
			}

			if (files.length === 1) {
				const file = files[0];
				const imageBuffer = file.buffer;
				const { originalname } = file;
				const sanitizedName = sanitizeFilename(originalname);
				const nameWithoutExt = path.parse(sanitizedName).name;

				const image = await Jimp.read({ data: imageBuffer });
				const mime = `image/${normalizedFormat}`;
				const convertedBuffer = await image.getBuffer(mime);

				const outputFileName = `${nameWithoutExt}_dkutils_converted_${Date.now()}.${normalizedFormat}`;
				const { error: uploadError } = await supabase.storage
					.from("utilityhub")
					.upload(outputFileName, convertedBuffer, {
						contentType: `image/${normalizedFormat}`,
					});

				if (uploadError) {
					throw uploadError;
				}

				const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

				return res.json({
					path: downloadUrl,
					originalname: outputFileName,
				});
			}

			const archive = archiver("zip", {
				zlib: { level: 9 },
			});

			const archiveBuffer = await new Promise((resolve, reject) => {
				const buffers = [];
				archive.on("data", (data) => buffers.push(data));
				archive.on("end", () => resolve(Buffer.concat(buffers)));
				archive.on("error", (err) => reject(err));

				const conversionPromises = files.map(async (file) => {
					const imageBuffer = file.buffer;
					const { originalname } = file;
					const sanitizedName = sanitizeFilename(originalname);
					const nameWithoutExt = path.parse(sanitizedName).name;

					const image = await Jimp.read({ data: imageBuffer });
					const mime = `image/${normalizedFormat}`;
					const convertedBuffer = await image.getBuffer(mime);

					archive.append(convertedBuffer, {
						name: `${nameWithoutExt}_dkutils_converted.${normalizedFormat}`,
					});
				});

				Promise.all(conversionPromises)
					.then(() => archive.finalize())
					.catch((err) => reject(err));
			});

			const zipFileName = `dkutils_converted_images_${Date.now()}.zip`;
			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(zipFileName, archiveBuffer, {
					contentType: "application/zip",
				});

			if (uploadError) {
				throw uploadError;
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(zipFileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: zipFileName,
			});
		} catch (err) {
			console.error(err);
			console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
			return res.status(500).json({ msg: "Server Error" });
		}
	},
);

// @route   POST /api/convert/base64-image
// @desc    Encode/Decode image to/from Base64
// @access  Public
router.post(
	"/base64-image",
	(req, res, next) => req.upload.single("image")(req, res, next),
	async (req, res) => {
		try {
			const { type, base64String } = req.body;

			if (type === "encode") {
				if (!req.file) {
					return res.status(400).json({ msg: "No image file uploaded for encoding." });
				}
				const imageBuffer = req.file.buffer;
				const base64 = imageBuffer.toString("base64");
				return res.json({ base64 });
			}

			if (type === "decode") {
				if (!base64String) {
					return res.status(400).json({ msg: "No base64 string provided for decoding." });
				}
				const buffer = Buffer.from(base64String, "base64");
				const outputFileName = `decoded_dkutils_${Date.now()}.png`;

				const { error: uploadError } = await supabase.storage
					.from("utilityhub")
					.upload(outputFileName, buffer, {
						contentType: "image/png",
					});

				if (uploadError) {
					throw uploadError;
				}

				const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

				return res.json({
					path: downloadUrl,
					originalname: outputFileName,
				});
			}
			return res.status(400).json({ msg: 'Invalid request type. Must be "encode" or "decode".' });
		} catch (err) {
			console.error(err);
			console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
			return res.status(500).json({ msg: "Server Error" });
		}
	},
);

// @route   POST /api/convert/image-flip
// @desc    Flip an image horizontally or vertically
// @access  Public
router.post(
	"/image-flip",
	(req, res, next) => req.upload.single("image")(req, res, next),
	async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({ msg: "No image file uploaded." });
			}

			const imageBuffer = req.file.buffer;
			const { originalname } = req.file;
			const { direction } = req.body;

			if (!direction || (direction !== "horizontal" && direction !== "vertical")) {
				return res.status(400).json({
					msg: "Invalid flip direction. Must be 'horizontal' or 'vertical'.",
				});
			}

			const image = await Jimp.read({ data: imageBuffer });
			const outputFormat = image.mime.split("/")[1];
			const extension = outputFormat === "jpeg" ? "jpg" : outputFormat;

			if (direction === "horizontal") {
				image.flip({ horizontal: true, vertical: false });
			} else if (direction === "vertical") {
				image.flip({ horizontal: false, vertical: true });
			}

			const flippedBuffer = await image.getBuffer(image.mime);
			const timestamp = Date.now();
			const sanitizedName = sanitizeFilename(originalname);
			const nameWithoutExt = path.parse(sanitizedName).name;
			const outputFileName = `${nameWithoutExt}_dkutils_flipped_${timestamp}.${extension}`;

			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(outputFileName, flippedBuffer, {
					contentType: image.mime,
				});

			if (uploadError) {
				throw uploadError;
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: outputFileName,
			});
		} catch (err) {
			console.error(err);
			return res.status(500).json({ msg: "Server Error" });
		}
	},
);

// @route   POST /api/convert/image-to-base64
// @desc    Convert image to Base64 string
// @access  Public
router.post(
	"/image-to-base64",
	(req, res, next) => req.upload.single("image")(req, res, next),
	async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({ msg: "No image file uploaded." });
			}

			const imageBuffer = req.file.buffer;
			const base64 = imageBuffer.toString("base64");
			return res.json({ base64 });
		} catch (err) {
			console.error(err);
			return res.status(500).json({ msg: "Server Error" });
		}
	},
);

// @route   POST /api/convert/image-grayscale
// @desc    Convert image to grayscale
// @access  Public
router.post(
	"/image-grayscale",
	(req, res, next) => req.upload.single("image")(req, res, next),
	async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({ msg: "No image file uploaded." });
			}

			const imageBuffer = req.file.buffer;
			const { originalname } = req.file;

			const image = await Jimp.read({ data: imageBuffer });
			const outputFormat = image.mime.split("/")[1];
			const extension = outputFormat === "jpeg" ? "jpg" : outputFormat;

			image.greyscale();
			const grayscaleBuffer = await image.getBuffer(image.mime);

			const timestamp = Date.now();
			const sanitizedName = sanitizeFilename(originalname);
			const nameWithoutExt = path.parse(sanitizedName).name;
			const outputFileName = `${nameWithoutExt}_dkutils_grayscale_${timestamp}.${extension}`;

			const { error: uploadError } = await supabase.storage
				.from("utilityhub")
				.upload(outputFileName, grayscaleBuffer, {
					contentType: image.mime,
				});

			if (uploadError) {
				throw uploadError;
			}

			const downloadUrl = `${req.protocol}://${req.get("host")}/api/convert/download?filename=${encodeURIComponent(outputFileName)}`;

			return res.json({
				path: downloadUrl,
				originalname: outputFileName,
			});
		} catch (err) {
			console.error(err);
			return res.status(500).json({ msg: "Server Error" });
		}
	},
);

module.exports = router;
