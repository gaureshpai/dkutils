import { Buffer } from "node:buffer";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { IMAGE_EXTENSIONS } from "../constants/index.js";
import type { BatchResult, FileTaskOptions, ImageFormat } from "../interfaces/index.js";
import { collectFiles, defaultOutputDir, mapOutputPath, writeBuffer } from "../utils/files.js";
import { applyImageWatermark } from "../utils/watermark.js";

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

function extensionForFormat(format: ImageFormat): string {
	return format === "jpeg" ? "jpg" : format;
}

/**
 * Modern image processor powered by sharp for high performance.
 */
async function processBatch(
	options: FileTaskOptions & {
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
					quality: (options as any).quality ?? 82,
					mozjpeg: true,
				});
			} else if (targetFormat === "webp") {
				pipeline.webp({ quality: (options as any).quality ?? 82 });
			} else if (targetFormat === "png") {
				pipeline.png({ compressionLevel: 9 });
			} else if (targetFormat === "avif") {
				pipeline.avif({ quality: (options as any).quality ?? 60 });
			}

			let buffer: any = await pipeline.toBuffer();

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
		} catch (error: any) {
			results.push({ input: file, error: error.message });
		}
	}
	return results;
}

export const convertImages = (opts: any) =>
	processBatch({ ...opts, suffix: "-converted", action: (p) => p });

export const compressImages = (opts: any) =>
	processBatch({
		...opts,
		suffix: "-compressed",
		action: (p) => p, // compression handled in processBatch via options.quality
	});

export const resizeImages = (opts: any) =>
	processBatch({
		...opts,
		suffix: "-resized",
		action: (p) =>
			p.resize({
				width: opts.width || undefined,
				height: opts.height || undefined,
				fit: "inside",
				withoutEnlargement: true,
			}),
	});

export const cropImages = (opts: any) =>
	processBatch({
		...opts,
		suffix: "-cropped",
		action: (p) =>
			p.extract({
				left: opts.left,
				top: opts.top,
				width: opts.width,
				height: opts.height,
			}),
	});

export const grayscaleImages = (opts: any) =>
	processBatch({ ...opts, suffix: "-grayscale", action: (p) => p.grayscale() });

export const flipImages = (opts: any) =>
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
			let buffer: any = Buffer.from(arrayBuffer);

			// Post-process with sharp to ensure optimized PNG
			buffer = await sharp(buffer).png().toBuffer();

			if (options.watermark !== false) {
				buffer = await applyImageWatermark(buffer, "png");
			}

			const outputPath = mapOutputPath(file, outputDir, "-no-bg", "png");
			await writeBuffer(outputPath, buffer);
			results.push({ input: file, output: outputPath });
		} catch (error: any) {
			results.push({ input: file, error: error.message });
		}
	}
	return results;
}

// Alias to maintain compatibility but prioritizing the cleaner name
export const removeImageBackground = removeBackground;

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

export const pngToJpg = (opts: any) => convertImages({ ...opts, format: "jpeg" });
export const convertToPng = (opts: any) => convertImages({ ...opts, format: "png" });

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
		} catch (e: any) {
			results.push({ input: file, error: e.message });
		}
	}
	return results;
}

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
