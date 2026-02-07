const PDFDocument = require("pdfkit");
const router = require("express").Router();
const archiver = require("archiver");
const sharp = require("sharp");
const path = require("path");
const os = require("os");
const fsp = require("fs").promises;
const { supabase } = require("../utils/supabaseClient");

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
        const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");
        const jpgBuffer = await sharp(imageBuffer).jpeg().toBuffer();
        const outputFileName = `dkutils_${nameWithoutExt}_converted_${Date.now()}.jpg`;

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
          const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");

          const jpgBuffer = await sharp(imageBuffer).jpeg().toBuffer();

          archive.append(jpgBuffer, {
            name: `dkutils_${nameWithoutExt}_converted.jpg`,
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

    const { data, error } = await supabase.storage
      .from("utilityhub")
      .download(filename);

    if (error) {
      throw error;
    }

    const baseName = path.basename(filename);
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.set("Content-Type", data.type || "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename="${baseName}"`);
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

          const image = sharp(imageBuffer);
          const metadata = await image.metadata();
          const pngBuffer = await image.png().toBuffer();

          tempImagePath = path.join(
            os.tmpdir(),
            `temp_image_${Date.now()}_${Math.random().toString(16).slice(2)}.png`,
          );
          await fsp.writeFile(tempImagePath, pngBuffer);

          const imgWidth = metadata.width;
          const imgHeight = metadata.height;

          pdfDoc.addPage({ width: imgWidth, height: imgHeight });
          pdfDoc.image(tempImagePath, 0, 0, {
            width: imgWidth,
            height: imgHeight,
          });
        } catch (imageErr) {
          console.error(
            `Error processing image ${file.originalname}:`,
            imageErr,
          );
          throw new Error(
            `Failed to process image ${file.originalname}: ${imageErr.message}`,
          );
        } finally {
          if (tempImagePath) {
            try {
              await fsp.unlink(tempImagePath);
            } catch (unlinkErr) {
              console.error(
                `Error deleting temp image file ${tempImagePath}:`,
                unlinkErr,
              );
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
      const parsedWidth = parseInt(width, 10);
      const parsedHeight = parseInt(height, 10);

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
        const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");

        let outputFormat = "jpeg";
        let extension = "jpg";
        try {
          const metadata = await sharp(imageBuffer).metadata();
          if (metadata.hasAlpha) {
            outputFormat = "png";
            extension = "png";
          }
        } catch (metadataErr) {
          console.error(
            `Error reading image metadata for ${originalname}:`,
            metadataErr,
          );
        }

        const resizedBuffer = await sharp(imageBuffer)
          .resize(parsedWidth, parsedHeight)
          .toFormat(outputFormat)
          .toBuffer();

        const outputFileName = `dkutils_${nameWithoutExt}_resized_${Date.now()}.${extension}`;
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
          const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");

          let outputFormat = "jpeg";
          let extension = "jpg";
          try {
            const metadata = await sharp(imageBuffer).metadata();
            if (metadata.hasAlpha) {
              outputFormat = "png";
              extension = "png";
            }
          } catch (metadataErr) {
            console.error(
              `Error reading image metadata for ${originalname}:`,
              metadataErr,
            );
          }

          const resizedBuffer = await sharp(imageBuffer)
            .resize(parsedWidth, parsedHeight)
            .toFormat(outputFormat)
            .toBuffer();

          archive.append(resizedBuffer, {
            name: `dkutils_${nameWithoutExt}_resized.${extension}`,
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
        return res
          .status(400)
          .json({ msg: "No image files uploaded for compression." });
      }

      const { quality } = req.body;
      const parsedQuality = parseInt(quality, 10);

      if (
        Number.isNaN(parsedQuality) ||
        parsedQuality < 0 ||
        parsedQuality > 100
      ) {
        return res.status(400).json({
          msg: "Invalid quality provided. Must be a number between 0 and 100.",
        });
      }

      if (files.length === 1) {
        const file = files[0];
        const imageBuffer = file.buffer;
        const { originalname } = file;
        const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");

        let compressedBuffer;
        let extension;
        let contentType;

        try {
          const metadata = await sharp(imageBuffer).metadata();
          const format = metadata.format;
          extension = format;
          contentType = `image/${format}`;

          let pipeline = sharp(imageBuffer, { animated: true });

          switch (format) {
            case "jpeg":
            case "jpg":
              pipeline = pipeline.jpeg({ quality: parsedQuality });
              extension = "jpg";
              contentType = "image/jpeg";
              break;
            case "png":
              pipeline = pipeline.png({ quality: parsedQuality });
              extension = "png";
              contentType = "image/png";
              break;
            case "webp":
              pipeline = pipeline.webp({ quality: parsedQuality });
              extension = "webp";
              contentType = "image/webp";
              break;
            case "tiff":
              pipeline = pipeline.tiff({ quality: parsedQuality });
              extension = "tiff";
              contentType = "image/tiff";
              break;
            case "avif":
              pipeline = pipeline.avif({ quality: parsedQuality });
              extension = "avif";
              contentType = "image/avif";
              break;
            case "gif":
              pipeline = pipeline.gif();
              extension = "gif";
              contentType = "image/gif";
              break;
            default:
              pipeline = pipeline.jpeg({ quality: parsedQuality });
              extension = "jpg";
              contentType = "image/jpeg";
          }
          compressedBuffer = await pipeline.toBuffer();
        } catch (error) {
          compressedBuffer = await sharp(imageBuffer)
            .jpeg({ quality: parsedQuality })
            .toBuffer();
          extension = "jpg";
          contentType = "image/jpeg";
        }

        const outputFileName = `dkutils_${nameWithoutExt}_compressed_${Date.now()}.${extension}`;
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
          const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");

          let compressedBuffer;
          let extension;

          try {
            const metadata = await sharp(imageBuffer).metadata();
            const format = metadata.format;
            extension = format;

            let pipeline = sharp(imageBuffer, { animated: true });

            switch (format) {
              case "jpeg":
              case "jpg":
                pipeline = pipeline.jpeg({ quality: parsedQuality });
                extension = "jpg";
                break;
              case "png":
                pipeline = pipeline.png({ quality: parsedQuality });
                extension = "png";
                break;
              case "webp":
                pipeline = pipeline.webp({ quality: parsedQuality });
                extension = "webp";
                break;
              case "tiff":
                pipeline = pipeline.tiff({ quality: parsedQuality });
                extension = "tiff";
                break;
              case "avif":
                pipeline = pipeline.avif({ quality: parsedQuality });
                extension = "avif";
                break;
              case "gif":
                pipeline = pipeline.gif();
                extension = "gif";
                break;
              default:
                pipeline = pipeline.jpeg({ quality: parsedQuality });
                extension = "jpg";
            }
            compressedBuffer = await pipeline.toBuffer();
          } catch (error) {
            // Fallback if metadata fails or something goes wrong, though unlikely with valid images
            compressedBuffer = await sharp(imageBuffer)
              .jpeg({ quality: parsedQuality })
              .toBuffer();
            extension = "jpg";
          }

          archive.append(compressedBuffer, {
            name: `dkutils_${nameWithoutExt}_compressed.${extension}`,
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
        const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");

        const convertedBuffer = await sharp(imageBuffer)
          .toFormat(normalizedFormat)
          .toBuffer();

        const outputFileName = `dkutils_${nameWithoutExt}_converted_${Date.now()}.${normalizedFormat}`;
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
          const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");

          const convertedBuffer = await sharp(imageBuffer)
            .toFormat(normalizedFormat)
            .toBuffer();

          archive.append(convertedBuffer, {
            name: `dkutils_${nameWithoutExt}_converted.${normalizedFormat}`,
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
          return res
            .status(400)
            .json({ msg: "No image file uploaded for encoding." });
        }
        const imageBuffer = req.file.buffer;
        const base64 = imageBuffer.toString("base64");
        return res.json({ base64 });
      }

      if (type === "decode") {
        if (!base64String) {
          return res
            .status(400)
            .json({ msg: "No base64 string provided for decoding." });
        }
        const buffer = Buffer.from(base64String, "base64");
        const outputFileName = `dkutils_decoded-${Date.now()}.png`;

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
      return res
        .status(400)
        .json({ msg: 'Invalid request type. Must be "encode" or "decode".' });
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

      let outputFormat;
      let extension;
      try {
        const metadata = await sharp(imageBuffer).metadata();
        if (metadata.format) {
          outputFormat = metadata.format;
        }
        if (outputFormat === "jpeg") {
          extension = "jpg";
        } else {
          extension = outputFormat;
        }
        if (!outputFormat || !extension) {
          throw new Error("Unable to detect image format");
        }
      } catch (metaErr) {
        console.error("Error detecting image format, falling back:", metaErr);
        const fallbackMeta = await sharp(imageBuffer).metadata();
        if (fallbackMeta.hasAlpha) {
          outputFormat = "png";
          extension = "png";
        } else {
          outputFormat = "jpeg";
          extension = "jpg";
        }
      }

      let flippedBuffer;
      if (direction === "horizontal") {
        flippedBuffer = await sharp(imageBuffer)
          .flop()
          .toFormat(outputFormat)
          .toBuffer();
      } else if (direction === "vertical") {
        flippedBuffer = await sharp(imageBuffer)
          .flip()
          .toFormat(outputFormat)
          .toBuffer();
      } else {
        return res.status(400).json({
          msg: "Invalid flip direction. Must be 'horizontal' or 'vertical'.",
        });
      }

      const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");
      const outputFileName = `dkutils_flipped-${nameWithoutExt}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("utilityhub")
        .upload(outputFileName, flippedBuffer, {
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

      let outputFormat;
      let extension;
      try {
        const metadata = await sharp(imageBuffer).metadata();
        if (metadata.format) {
          outputFormat = metadata.format;
        }
        if (outputFormat === "jpeg") {
          extension = "jpg";
        } else {
          extension = outputFormat;
        }
        if (!outputFormat || !extension) {
          throw new Error("Unable to detect image format");
        }
      } catch (metaErr) {
        console.error("Error detecting image format, falling back:", metaErr);
        const fallbackMeta = await sharp(imageBuffer).metadata();
        if (fallbackMeta.hasAlpha) {
          outputFormat = "png";
          extension = "png";
        } else {
          outputFormat = "jpeg";
          extension = "jpg";
        }
      }

      const grayscaleBuffer = await sharp(imageBuffer)
        .grayscale()
        .toFormat(outputFormat)
        .toBuffer();

      const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");
      const outputFileName = `dkutils_grayscale-${nameWithoutExt}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("utilityhub")
        .upload(outputFileName, grayscaleBuffer, {
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
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: "Server Error" });
    }
  },
);

module.exports = router;
