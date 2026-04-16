import { Buffer } from "node:buffer";
import path from "node:path";
import { IMAGE_EXTENSIONS } from "@package/constants/index.js";
import type {
	BatchResult,
	CompressImagesOptions,
	ConvertImagesOptions,
	CropOptions,
	FileTaskOptions,
	FlipOptions,
	ImageFormat,
	ImageQualityOptions,
	ResizeOptions,
} from "@package/interfaces/index.js";
import {
	collectFiles,
	defaultOutputDir,
	mapOutputPath,
	writeBuffer,
} from "@package/utils/files.js";
import { applyImageWatermark } from "@package/utils/watermark.js";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

/**
 * Normalizes the given image format to one of the supported formats.
 * @param {string} [format] - The image format to normalize.
 * @returns {ImageFormat} The normalized image format.
 */
function normalizeFormat(format?: string): ImageFormat {
	switch (format?.toLowerCase() || "") {
		case "png":
			return "png";
		case "webp":
			return "webp";
		case "tiff":
			return "tiff";
		case "gif":
			return "gif";
		case "avif":
			return "avif";
		default:
			return "jpeg";
	}
}

/**
 * Returns the file extension associated with the given image format.
 * @param {ImageFormat} format - The image format.
 * @returns {string} The file extension associated with the given image format.
 */
function extensionForFormat(format: ImageFormat): string {
	return format === "jpeg" ? "jpg" : format;
}

/**
 * Modern image processor powered by sharp for high performance.
 */
async function processBatch(
	options: FileTaskOptions &
		ImageQualityOptions & {
			format?: string;
			suffix: string;
			action: (pipeline: sharp.Sharp) => sharp.Sharp;
		},
): Promise<BatchResult[]> {
	const files = await collectFiles(options.input, IMAGE_EXTENSIONS);
	const targetFormat = normalizeFormat(options.format);
	const outputDir = path.resolve(options.output ?? defaultOutputDir(options.input));
	const results: BatchResult[] = [];

	for (const file of files) {
		try {
			let pipeline = sharp(file);
			pipeline = options.action(pipeline);

			const { formatStr, metadata } = await (async () => {
				const meta = await pipeline.metadata();
				return { formatStr: meta.format || targetFormat, metadata: meta };
			})();

			// Quality and format-specific options
			if (targetFormat === "jpeg" || targetFormat === "jpg") {
				pipeline.jpeg({
					quality: options.quality ?? 82,
					mozjpeg: true,
				});
			} else if (targetFormat === "webp") {
				pipeline.webp({ quality: options.quality ?? 82 });
			} else if (targetFormat === "png") {
				pipeline.png({ compressionLevel: 9 });
			} else if (targetFormat === "avif") {
				pipeline.avif({ quality: options.quality ?? 60 });
			}

			let buffer = await pipeline.toBuffer();

			if (options.watermark !== false) {
				buffer = await applyImageWatermark(buffer, targetFormat);
			}

			const outputPath = mapOutputPath(
				file,
				outputDir,
				options.suffix,
				extensionForFormat(targetFormat),
			);
			await writeBuffer(outputPath, buffer);
			results.push({ input: file, output: outputPath });
		} catch (error) {
			results.push({
				input: file,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return results;
}

/**
 * Convert images between formats (PNG, JPEG, WebP, etc.) in batch.
 * @param {ConvertImagesOptions} opts - Options for image conversion.
 * @param {string} opts.input - Path to an image file or a directory of images.
 * @param {string} [opts.format] - Target format (png, jpeg, webp, etc.).
 * @param {string} [opts.suffix] - Suffix to add to output filenames.
 * @param {boolean} [opts.recursive] - Recursively search for images in subdirectories.
 * @param {boolean} [opts.watermark] - Add a watermark to the processed images.
 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of image conversion results.
 */
export const convertImages = (opts: ConvertImagesOptions) =>
	processBatch({ ...opts, suffix: "-converted", action: (p) => p });

/**
 * Compress images using adjustable quality settings in batch.
 * @param {CompressImagesOptions} opts - Options for image compression.
 * @param {string} opts.input - Path to an image file or a directory of images.
 * @param {number} [opts.quality] - Compression quality (1-100, default: 82).
 * @param {string} [opts.suffix] - Suffix to add to output filenames.
 * @param {boolean} [opts.recursive] - Recursively search for images in subdirectories.
 * @param {boolean} [opts.watermark] - Add a watermark to the processed images.
 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of image compression results.
 */
export const compressImages = (opts: CompressImagesOptions) =>
	processBatch({
		...opts,
		suffix: "-compressed",
		action: (p) => p,
	});

/**
 * Resize images in batch.
 * @param {ResizeOptions} opts - Options for image resizing.
 * @param {string} opts.input - Path to an image file or a directory of images.
 * @param {number} [opts.width] - New width in pixels.
 * @param {number} [opts.height] - New height in pixels.
 * @param {string} [opts.suffix] - Suffix to add to output filenames.
 * @param {boolean} [opts.recursive] - Recursively search for images in subdirectories.
 * @param {boolean} [opts.watermark] - Add a watermark to the processed images.
 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of image resizing results.
 */
export const resizeImages = (opts: ResizeOptions) =>
	processBatch({
		...opts,
		suffix: "-resized",
		/**
		 * Resize the image to the specified width and height while maintaining the aspect ratio.
		 * If either width or height is undefined, the image will be resized to the specified dimension while maintaining the aspect ratio.
		 * @param {ResizeOptions} p - Options for image resizing.
		 * @returns {Promise<Sharp.Image>} A promise that resolves with the resized image.
		 */
		action: (p) =>
			p.resize({
				width: opts.width || undefined,
				height: opts.height || undefined,
				fit: "inside",
				withoutEnlargement: true,
			}),
	});

/**
 * Crop images in batch.
 * @param {CropOptions} opts - Options for image cropping.
 * @param {string} opts.input - Path to an image file or a directory of images.
 * @param {number} opts.left - Horizontal start coordinate.
 * @param {number} opts.top - Vertical start coordinate.
 * @param {number} opts.width - Width of the crop area.
 * @param {number} opts.height - Height of the crop area.
 * @param {string} [opts.suffix] - Suffix to add to output filenames.
 * @param {boolean} [opts.recursive] - Recursively search for images in subdirectories.
 * @param {boolean} [opts.watermark] - Add a watermark to the processed images.
 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of image cropping results.
 */
export const cropImages = (opts: CropOptions) =>
	processBatch({
		...opts,
		suffix: "-cropped",
		/**
		 * Crop the image using the specified coordinates and dimensions.
		 * @param {CropOptions} p - Options for image cropping.
		 * @returns {Promise<Sharp.Image>} A promise that resolves with the cropped image.
		 */
		action: (p) =>
			p.extract({
				left: opts.left,
				top: opts.top,
				width: opts.width,
				height: opts.height,
			}),
	});

/**
 * Convert images to grayscale in batch.
 * @param {FileTaskOptions} opts - Options for batch image grayscale conversion.
 * @param {string} opts.input - Path to an image file or a directory of images.
 * @param {string} [opts.suffix] - Suffix to add to output filenames.
 * @param {boolean} [opts.recursive] - Recursively search for images in subdirectories.
 * @param {boolean} [opts.watermark] - Add a watermark to the processed images.
 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of image grayscale conversion results.
 */
export const grayscaleImages = (opts: FileTaskOptions) =>
	processBatch({ ...opts, suffix: "-grayscale", action: (p) => p.grayscale() });

/**
 * Flip images horizontally or vertically in batch.
 * @param {FlipOptions} opts - Options for batch image flipping.
 * @param {string} opts.input - Path to an image file or a directory of images.
 * @param {"horizontal" | "vertical"} opts.direction - Flip direction.
 * @param {string} [opts.suffix] - Suffix to add to output filenames.
 * @param {boolean} [opts.recursive] - Recursively search for images in subdirectories.
 * @param {boolean} [opts.watermark] - Add a watermark to the processed images.
 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of image flipping results.
 */
export const flipImages = (opts: FlipOptions) =>
	processBatch({
		...opts,
		suffix: "-flipped",
		action: (p) => {
			if (opts.direction === "horizontal") return p.flop();
			if (opts.direction === "vertical") return p.flip();
			return p;
		},
	});

/**
 * AI-powered background remover. Renamed and fixed for proper "spark" integration.
 */
export async function removeBackground(options: FileTaskOptions): Promise<BatchResult[]> {
	const files = await collectFiles(options.input, IMAGE_EXTENSIONS);
	const outputDir = path.resolve(options.output ?? defaultOutputDir(options.input));
	const results: BatchResult[] = [];

	const { removeBackground: runRemoval } = await import("@imgly/background-removal-node");
	const config = {
		publicPath: import.meta
			.resolve("@imgly/background-removal-node")
			.replace(/index\.[mc]?js$/, ""),
	};

	for (const file of files) {
		try {
			const resultBlob = await runRemoval(file, config);
			const arrayBuffer = await resultBlob.arrayBuffer();
			let buffer: Buffer = Buffer.from(arrayBuffer);

			// Post-process with sharp to ensure optimized PNG
			buffer = (await sharp(buffer).png().toBuffer()) as Buffer;

			if (options.watermark !== false) {
				buffer = (await applyImageWatermark(buffer, "png")) as Buffer;
			}

			const outputPath = mapOutputPath(file, outputDir, "-no-bg", "png");
			await writeBuffer(outputPath, buffer);
			results.push({ input: file, output: outputPath });
		} catch (error) {
			results.push({
				input: file,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return results;
}

// Alias to maintain compatibility but prioritizing the cleaner name
export const removeImageBackground = removeBackground;

/**
 * Combine multiple images into a single PDF document.
 * @param {FileTaskOptions} options - Options for batch image to PDF conversion.
 * @param {string} options.input - Path to an image file or a directory of images.
 * @param {string} [options.output] - Path to the output directory.
 * @returns {Promise<string>} A promise that resolves with the path to the output PDF file.
 */
export async function convertImagesToPdf(options: FileTaskOptions): Promise<string> {
	const files = await collectFiles(options.input, IMAGE_EXTENSIONS);
	const pdfDoc = await PDFDocument.create();
	const outputDir = path.resolve(options.output ?? defaultOutputDir(options.input));
	const outputPath = path.join(outputDir, "dkutils-images.pdf");

	for (const file of files) {
		try {
			// Pre-process frame with sharp for consistency and format support
			const buf = await sharp(file).jpeg().toBuffer();
			const img = await pdfDoc.embedJpg(buf);
			const page = pdfDoc.addPage([img.width, img.height]);
			page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
		} catch {}
	}
	await writeBuffer(outputPath, Buffer.from(await pdfDoc.save()));
	return outputPath;
}

/**
 * Quick conversion of PNG files to optimized JPEG format.
 * @param {FileTaskOptions} opts - Options for batch PNG to JPEG conversion.
 * @returns {Promise<string>} A promise that resolves with the path to the output JPEG file.
 */
export const pngToJpg = (opts: FileTaskOptions) =>
	convertImages({ ...opts, format: "jpeg" as ImageFormat });

/**
 * Convert image files to PNG format.
 * @param {FileTaskOptions} options - Options for batch image to PNG conversion.
 * @param {string} options.input - Path to an image file or a directory of images.
 * @param {string} [options.output] - Path to the output directory.
 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of batch results, each containing the input file and the output PNG file.
 */
export const convertToPng = (opts: FileTaskOptions) =>
	convertImages({ ...opts, format: "png" as ImageFormat });

/**
 * Convert image files to Base64 encoded text strings.
 * @param {FileTaskOptions} options - Options for batch image to Base64 conversion.
 * @param {string} options.input - Path to an image file or a directory of images.
 * @param {string} [options.output] - Path to the output directory.
 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of batch results, each containing the input file and the output Base64 string.
 */
export async function imageToBase64(options: FileTaskOptions): Promise<BatchResult[]> {
	const files = await collectFiles(options.input, IMAGE_EXTENSIONS);
	const results: BatchResult[] = [];
	for (const file of files) {
		try {
			const metadata = await sharp(file).metadata();
			const mime = `image/${metadata.format}`;
			const buffer = await sharp(file).toBuffer();
			results.push({
				input: file,
				output: `data:${mime};base64,${buffer.toString("base64")}`,
			});
		} catch (e) {
			results.push({
				input: file,
				error: e instanceof Error ? e.message : String(e),
			});
		}
	}
	return results;
}

/**
 * Decode a Base64 encoded image string and write it to a file.
 * @param {Object} options - Options for decoding and writing the image.
 * @param {string} options.base64 - Base64 encoded image string.
 * @param {string} [options.output] - Path to the output file.
 * @param {string} [options.format] - Image format (png, jpeg, webp, tiff, gif, avif).
 * @returns {Promise<string>} A promise that resolves with the path to the output image file.
 */
export async function base64ToImage(options: {
	base64: string;
	output?: string;
	format?: string;
}): Promise<string> {
	const format = normalizeFormat(options.format);
	const value = options.base64.replace(/^data:.*;base64,/, "");
	const buffer = Buffer.from(value, "base64");
	const outputPath =
		options.output ??
		path.join(process.cwd(), `decoded-${Date.now()}.${extensionForFormat(format)}`);
	await writeBuffer(outputPath, buffer);
	return outputPath;
}

/**
 * Backwards compatibility for removePG as requested.
 */
export const removePG = removeBackground;
