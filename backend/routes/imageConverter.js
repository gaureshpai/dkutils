const PDFDocument = require("pdfkit");
const router = require("express").Router();
const archiver = require("archiver");
const sharp = require("sharp");
const path = require("path");
const os = require("os");
const fsp = require("fs").promises;
const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is required for server-side Supabase storage operations.",
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

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

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(zipFileName);

      return res.json({
        path: publicUrlData.publicUrl,
        originalname: zipFileName,
      });
    } catch (err) {
      console.error(err);
      console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
      return res.status(500).json({ msg: "Server Error" });
    }
  },
);

// @route   GET /api/convert/download-image/:filename
// @desc    Download a converted image
// @access  Public
router.get("/download-image/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const { data, error } = await supabase.storage
      .from("utilityhub")
      .download(filename);

    if (error) {
      throw error;
    }

    res.set("Content-Type", data.type);
    res.set("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(data);
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

      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      const archiveBuffer = await new Promise((resolve, reject) => {
        const archiveBuffers = [];
        archive.on("data", (data) => archiveBuffers.push(data));
        archive.on("end", () => resolve(Buffer.concat(archiveBuffers)));
        archive.on("error", (err) => reject(err));

        archive.append(pdfBuffer, {
          name: `dkutils_converted_images_${Date.now()}.pdf`,
        });
        archive.finalize();
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

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(zipFileName);

      return res.json({
        path: publicUrlData.publicUrl,
        originalname: zipFileName,
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

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(zipFileName);

      return res.json({
        path: publicUrlData.publicUrl,
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

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(zipFileName);

      return res.json({
        path: publicUrlData.publicUrl,
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
      if (!format || !allowedFormats.includes(format.toLowerCase())) {
        return res.status(400).json({
          msg: `Invalid format provided. Allowed formats are: ${allowedFormats.join(", ")}`,
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
            .toFormat(format)
            .toBuffer();

          archive.append(convertedBuffer, {
            name: `dkutils_${nameWithoutExt}_converted.${format}`,
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

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(zipFileName);

      return res.json({
        path: publicUrlData.publicUrl,
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

        const archive = archiver("zip", {
          zlib: { level: 9 },
        });

        const archiveBuffer = await new Promise((resolve, reject) => {
          const buffers = [];
          archive.on("data", (data) => buffers.push(data));
          archive.on("end", () => resolve(Buffer.concat(buffers)));
          archive.on("error", (err) => reject(err));

          archive.append(buffer, { name: outputFileName });
          archive.finalize();
        });

        const zipFileName = `dkutils_decoded_image_${Date.now()}.zip`;
        const { error: uploadError } = await supabase.storage
          .from("utilityhub")
          .upload(zipFileName, archiveBuffer, {
            contentType: "application/zip",
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("utilityhub")
          .getPublicUrl(zipFileName);

        return res.json({
          path: publicUrlData.publicUrl,
          originalname: zipFileName,
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

      let flippedBuffer;
      if (direction === "horizontal") {
        flippedBuffer = await sharp(imageBuffer).flop().jpeg().toBuffer();
      } else if (direction === "vertical") {
        flippedBuffer = await sharp(imageBuffer).flip().jpeg().toBuffer();
      } else {
        return res.status(400).json({
          msg: "Invalid flip direction. Must be 'horizontal' or 'vertical'.",
        });
      }

      const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");
      const outputFileName = `dkutils_flipped-${nameWithoutExt}.jpg`;

      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      const archiveBuffer = await new Promise((resolve, reject) => {
        const buffers = [];
        archive.on("data", (data) => buffers.push(data));
        archive.on("end", () => resolve(Buffer.concat(buffers)));
        archive.on("error", (err) => reject(err));

        archive.append(flippedBuffer, { name: outputFileName });
        archive.finalize();
      });

      const zipFileName = `dkutils_flipped_image_${Date.now()}.zip`;
      const { error: uploadError } = await supabase.storage
        .from("utilityhub")
        .upload(zipFileName, archiveBuffer, {
          contentType: "application/zip",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(zipFileName);

      return res.json({
        path: publicUrlData.publicUrl,
        originalname: zipFileName,
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

      const grayscaleBuffer = await sharp(imageBuffer)
        .grayscale()
        .jpeg()
        .toBuffer();

      const nameWithoutExt = originalname.split(".").slice(0, -1).join(".");
      const outputFileName = `dkutils_grayscale-${nameWithoutExt}.jpg`;

      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      const archiveBuffer = await new Promise((resolve, reject) => {
        const buffers = [];
        archive.on("data", (data) => buffers.push(data));
        archive.on("end", () => resolve(Buffer.concat(buffers)));
        archive.on("error", (err) => reject(err));

        archive.append(grayscaleBuffer, { name: outputFileName });
        archive.finalize();
      });

      const zipFileName = `dkutils_grayscale_image_${Date.now()}.zip`;
      const { error: uploadError } = await supabase.storage
        .from("utilityhub")
        .upload(zipFileName, archiveBuffer, {
          contentType: "application/zip",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("utilityhub")
        .getPublicUrl(zipFileName);

      return res.json({
        path: publicUrlData.publicUrl,
        originalname: zipFileName,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: "Server Error" });
    }
  },
);

module.exports = router;
