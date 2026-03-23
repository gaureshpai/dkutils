import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { confirm, input, select } from "@inquirer/prompts";

import { DKU_BRAND, capabilityGroups } from "./constants/index.js";
import {
	type CompressionLevel,
	type FlipDirection,
	type ImageFormat,
	type YouTubeFormat,
	YouTubeVideoInfo,
} from "./interfaces/index.js";

const imageFormatChoices: { name: ImageFormat; value: ImageFormat }[] = [
	{ name: "jpeg", value: "jpeg" },
	{ name: "png", value: "png" },
	{ name: "webp", value: "webp" },
	{ name: "tiff", value: "tiff" },
	{ name: "gif", value: "gif" },
	{ name: "avif", value: "avif" },
];

const compressionLevelChoices: {
	name: CompressionLevel;
	value: CompressionLevel;
}[] = [
	{ name: "low", value: "low" },
	{ name: "medium", value: "medium" },
	{ name: "high", value: "high" },
];

export async function startInteractiveCli(print: (value: unknown) => void): Promise<void> {
	const group = await select({
		message: `${DKU_BRAND}: choose a tool group`,
		choices: Object.entries(capabilityGroups).map(([name, commands]) => ({
			name: `${name} (${commands.length})`,
			value: name,
			description: commands.join(", "),
		})),
	});

	switch (group) {
		case "image":
			await runImageWizard(print);
			return;
		case "pdf":
			await runPdfWizard(print);
			return;
		case "video":
			await runVideoWizard(print);
			return;
		case "youtube":
			await runYoutubeWizard(print);
			return;
	}
}

async function runImageWizard(print: (value: unknown) => void): Promise<void> {
	const action = await select({
		message: "Choose an image operation",
		choices: capabilityGroups.image.map((item) => ({
			name: item,
			value: item,
		})),
	});

	const module = await import("./image/index.js");

	const inputPath = ".";
	const recursive = false;
	process.stdout.write(`Input: ${inputPath} (recursive: ${recursive ? "yes" : "no"})\n`);

	try {
		switch (action) {
			case "remove-bg":
				print(
					await module.removeImageBackground({
						input: inputPath,
						recursive,
						watermark: await askWatermark(),
					}),
				);
				return;
			case "to-png":
				print(
					await module.convertToPng({
						input: inputPath,
						recursive,
					}),
				);
				return;
			case "convert":
				print(
					await module.convertImages({
						input: inputPath,
						format: await select<ImageFormat>({
							message: "Target format",
							choices: imageFormatChoices,
						}),
						recursive,
						watermark: await askWatermark(),
					}),
				);
				return;
			case "compress":
				print(
					await module.compressImages({
						input: inputPath,
						quality: await askNumber("Quality (1-100)", 82),
						recursive,
						watermark: await askWatermark(),
					}),
				);
				return;
			case "resize":
				print(
					await module.resizeImages({
						input: inputPath,
						width: await askNumber("Width"),
						height: await askNumber("Height"),
						recursive,
						watermark: await askWatermark(),
					}),
				);
				return;
			case "crop":
				print(
					await module.cropImages({
						input: inputPath,
						left: await askNumber("Left"),
						top: await askNumber("Top"),
						width: await askNumber("Width"),
						height: await askNumber("Height"),
						recursive,
						watermark: await askWatermark(),
					}),
				);
				return;
			case "grayscale":
				print(
					await module.grayscaleImages({
						input: inputPath,
						recursive,
						watermark: await askWatermark(),
					}),
				);
				return;
			case "flip":
				print(
					await module.flipImages({
						input: inputPath,
						direction: await select<FlipDirection>({
							message: "Flip direction",
							choices: [
								{ name: "horizontal", value: "horizontal" },
								{ name: "vertical", value: "vertical" },
							],
						}),
						recursive,
						watermark: await askWatermark(),
					}),
				);
				return;
			case "to-pdf":
				print(
					await module.convertImagesToPdf({
						input: inputPath,
						recursive,
						watermark: await askWatermark(),
					}),
				);
				return;
			case "to-base64":
				print(
					await module.imageToBase64({
						input: inputPath,
						recursive,
						stdout: await confirm({
							message: "Also print the first Base64 result to stdout?",
							default: false,
						}),
					}),
				);
				return;
			case "from-base64":
				print(
					await module.base64ToImage({
						base64: await ask("Base64 string"),
						format: await select<ImageFormat>({
							message: "Output format",
							choices: imageFormatChoices,
						}),
					}),
				);
				return;
			case "png-to-jpg":
				print(
					await module.pngToJpg({
						input: inputPath,
						recursive,
						watermark: await askWatermark(),
					}),
				);
				return;
		}
	} catch (err) {
		console.error(handleUserError(err));
	}
}

async function runPdfWizard(print: (value: unknown) => void): Promise<void> {
	const action = await select({
		message: "Choose a PDF operation",
		choices: capabilityGroups.pdf.map((item) => ({ name: item, value: item })),
	});
	const module = await import("./pdf/index.js");

	const inputPath = ".";
	if (!(await isValidPath(inputPath))) {
		console.error(`Error: Path "${inputPath}" does not exist.`);
		return;
	}

	const watermark = await askWatermark();

	try {
		switch (action) {
			case "merge": {
				let files: string[] = [];
				const stats = await fs.stat(path.resolve(inputPath));
				if (stats.isDirectory()) {
					const entries = await fs.readdir(path.resolve(inputPath));
					files = entries
						.filter((e) => e.toLowerCase().endsWith(".pdf"))
						.map((e) => path.join(inputPath, e));
				} else {
					files = inputPath
						.split(",")
						.map((v) => v.trim())
						.filter(Boolean);
				}

				if (files.length === 0) {
					console.error("No PDF files found to merge.");
					return;
				}

				const result = await module.mergePdfs(
					files,
					getAutoOutputPath(files[0], "-merged", "pdf"),
					watermark,
				);
				console.info("\nPDF files merged successfully.");
				print(result);
				return;
			}
			case "split": {
				const result = await module.splitPdf(
					inputPath,
					await ask("Page ranges, e.g. 1-3,5"),
					getAutoOutputPath(inputPath, "-split", "pdf"),
					watermark,
				);
				console.info("\nPDF split successfully.");
				print(result);
				return;
			}
			case "compress": {
				const result = await module.compressPdf(
					inputPath,
					getAutoOutputPath(inputPath, "-compressed", "pdf"),
					await select<CompressionLevel>({
						message: "Compression level",
						choices: compressionLevelChoices,
					}),
					watermark,
				);
				console.info("\nPDF compressed successfully.");
				print(result);
				return;
			}
			case "rotate": {
				const result = await module.rotatePdf(
					inputPath,
					await askNumber("Rotation angle", 90),
					getAutoOutputPath(inputPath, "-rotated", "pdf"),
					watermark,
				);
				console.info("\nPDF rotated successfully.");
				print(result);
				return;
			}
			case "delete-pages": {
				const result = await module.deletePdfPages(
					inputPath,
					await ask("Page ranges to delete"),
					getAutoOutputPath(inputPath, "-deleted", "pdf"),
					watermark,
				);
				console.info("\nPDF pages deleted successfully.");
				print(result);
				return;
			}
			case "to-text": {
				const result = await module.pdfToText(inputPath);
				console.info("\nPDF text extracted successfully.");
				print(result);
				return;
			}
			case "to-word": {
				const result = await module.pdfToWord(inputPath, getAutoOutputPath(inputPath, "", "docx"));
				console.info("\nPDF converted to Word successfully.");
				print(result);
				return;
			}
			case "to-excel": {
				const result = await module.pdfToExcel(inputPath, getAutoOutputPath(inputPath, "", "xlsx"));
				console.info("\nPDF converted to Excel successfully.");
				print(result);
				return;
			}
			case "text-to-pdf": {
				const result = await module.textToPdf(
					await ask("Text content"),
					path.join(process.cwd(), "dkutils-text-output.pdf"),
					watermark,
				);
				console.info("\nText converted to PDF successfully.");
				print(result);
				return;
			}
		}
	} catch (err) {
		console.error(handleUserError(err));
	}
}

async function runVideoWizard(print: (value: unknown) => void): Promise<void> {
	const action = await select({
		message: "Choose a video operation",
		choices: capabilityGroups.video.map((item) => ({
			name: item,
			value: item,
		})),
	});
	const module = await import("./video/index.js");

	const inputPath = ".";
	if (!(await isValidPath(inputPath))) {
		console.error(`Error: Path "${inputPath}" does not exist.`);
		return;
	}

	try {
		switch (action) {
			case "mov-to-mp4": {
				const result = await module.convertMovToMp4({
					input: inputPath,
				});
				console.info("\nMOV converted to MP4 successfully.");
				print(result);
				return;
			}
			case "compress": {
				const result = await module.compressVideo({
					input: inputPath,
					quality: await askNumber("Quality (18-35, lower is better)", 23),
				});
				console.info("\nVideo compressed successfully.");
				print(result);
				return;
			}
			case "remove-bg": {
				const fps = await askNumber(
					"Frames per second to process (1 = fast preview, higher = smoother)",
					1,
				);
				console.info(
					"\nRemoving background... (this may take several minutes depending on video length and fps)",
				);
				const result = await module.removeVideoBackground({
					input: inputPath,
					fps,
				});
				console.info("\nVideo background removal complete.");
				print(result);
				return;
			}
		}
	} catch (err) {
		console.error(handleUserError(err));
	}
}

async function runYoutubeWizard(print: (value: unknown) => void): Promise<void> {
	const module = await import("./video/index.js");
	const url = await ask("YouTube URL");

	try {
		console.info("Fetching video information...");
		// Use best combined format by default to avoid manual selection and merge issues
		const result = await module.downloadYouTubeVideo(url, process.cwd(), {
			format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
		});
		print(result);
		console.info("\nYouTube video downloaded successfully.");
	} catch (err) {
		console.error(handleUserError(err));
	}
}

async function ask(message: string, defaultValue?: string): Promise<string> {
	return input({ message, default: defaultValue });
}

async function askNumber(message: string, defaultValue?: number): Promise<number> {
	const value = await input({
		message,
		default: defaultValue ? String(defaultValue) : undefined,
		validate: (current) => (Number.isNaN(Number(current)) ? "Enter a valid number." : true),
	});
	return Number(value);
}

import { handleUserError, readConfig, writeConfig } from "./utils/index.js";

async function askWatermark(): Promise<boolean> {
	const config = await readConfig();
	if (config.watermark !== undefined) {
		return config.watermark;
	}

	const result = await confirm({
		message: "Keep the dkutils watermark?",
		default: true,
	});

	const save = await confirm({
		message: "Save this preference for future runs?",
		default: true,
	});

	if (save) {
		await writeConfig({ watermark: result });
	}

	return result;
}

async function isValidPath(p: string): Promise<boolean> {
	try {
		await fs.access(path.resolve(p));
		return true;
	} catch {
		return false;
	}
}

function getAutoOutputPath(inputPath: string, suffix: string, ext: string): string {
	const absoluteInput = path.resolve(inputPath);
	const parsed = path.parse(absoluteInput);
	return path.join(parsed.dir, `${parsed.name}${suffix}.${ext}`);
}
