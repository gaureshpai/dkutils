import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderCliBanner } from "@package/branding.js";
import { startInteractiveCli } from "@package/interactive.js";
import type { CompressionLevel } from "@package/interfaces/index.js";
import { handleUserError, readConfig } from "@package/utils/index.js";
import { Command } from "commander";

/**
 * Returns the user's preference for including a watermark in output files.
 * If optionValue is false, it will return false.
 * Otherwise, it will read the user's configuration and return the watermark preference.
 * @param {boolean} [optionValue=false] - The value of the watermark preference.
 * @returns {Promise<boolean>} - A promise that resolves to the user's watermark preference.
 */
async function getWatermarkPreference(optionValue?: boolean): Promise<boolean> {
	if (optionValue === false) return false;
	const config = await readConfig();
	return config.watermark !== false;
}

const program = new Command();

program
	.name("dkutils")
	.description(
		"dkutils: A powerful, interactive utility toolkit for image, PDF, and media processing.",
	)
	.showHelpAfterError()
	.option("--json", "Format output as JSON for programmatic use.");

const imageCommand = new Command("image").description(
	"Tools for batch image processing, conversion, and optimization.",
);
imageCommand
	.addCommand(
		new Command("convert")
			.description("Convert images between formats (PNG, JPEG, WebP, etc.) in batch.")
			.option("-i, --input <path>", "Path to an image file or a directory of images.", ".")
			.requiredOption("-f, --format <format>", "Target format (png, jpeg, webp, tiff, gif, avif).")
			.option("-r, --recursive", "Recursively search for images in subdirectories.", false)
			.option("--no-watermark", "Remove dkutils watermark from processed images.")
			.action(async (options) =>
				print(
					await (await import("@package/image/index.js")).convertImages({
						input: options.input,
						format: options.format,
						recursive: options.recursive,
						watermark: await getWatermarkPreference(options.watermark),
					}),
				),
			),
	)
	.addCommand(
		new Command("compress")
			.description("Reduce image file size with adjustable quality settings.")
			.option("-i, --input <path>", "Path to an image file or a directory of images.", ".")
			.option("-q, --quality <number>", "Compression quality (1-100, default: 82).", parseInteger)
			.option("-r, --recursive", "Recursively search for images in subdirectories.", false)
			.option("--no-watermark", "Remove dkutils watermark from processed images.")
			.action(async (options) =>
				print(
					await (await import("@package/image/index.js")).compressImages({
						input: options.input,
						quality: options.quality,
						recursive: options.recursive,
						watermark: await getWatermarkPreference(options.watermark),
					}),
				),
			),
	)
	.addCommand(
		new Command("resize")
			.description("Batch resize images to specific width and height dimensions.")
			.option("-i, --input <path>", "Path to an image file or a directory of images.", ".")
			.requiredOption("-w, --width <number>", "New width in pixels.", parseInteger)
			.requiredOption("-h, --height <number>", "New height in pixels.", parseInteger)
			.option("-r, --recursive", "Recursively search for images in subdirectories.", false)
			.option("--no-watermark", "Remove dkutils watermark from processed images.")
			.action(async (options) =>
				print(
					await (await import("@package/image/index.js")).resizeImages({
						input: options.input,
						width: options.width,
						height: options.height,
						recursive: options.recursive,
						watermark: await getWatermarkPreference(options.watermark),
					}),
				),
			),
	)
	.addCommand(
		new Command("crop")
			.description("Batch crop images using specified coordinates and dimensions.")
			.option("-i, --input <path>", "Path to an image file or a directory of images.", ".")
			.requiredOption("-l, --left <number>", "Horizontal start coordinate.", parseInteger)
			.requiredOption("-t, --top <number>", "Vertical start coordinate.", parseInteger)
			.requiredOption("-w, --width <number>", "Width of the crop area.", parseInteger)
			.requiredOption("-h, --height <number>", "Height of the crop area.", parseInteger)
			.option("-r, --recursive", "Recursively search for images in subdirectories.", false)
			.option("--no-watermark", "Remove dkutils watermark from processed images.")
			.action(async (options) =>
				print(
					await (await import("@package/image/index.js")).cropImages({
						input: options.input,
						left: options.left,
						top: options.top,
						width: options.width,
						height: options.height,
						recursive: options.recursive,
						watermark: await getWatermarkPreference(options.watermark),
					}),
				),
			),
	)
	.addCommand(
		new Command("grayscale")
			.description("Convert color images to grayscale (black and white) in batch.")
			.option("-i, --input <path>", "Path to an image file or a directory of images.", ".")
			.option("-r, --recursive", "Recursively search for images in subdirectories.", false)
			.option("--no-watermark", "Remove dkutils watermark from processed images.")
			.action(async (options) =>
				print(
					await (await import("@package/image/index.js")).grayscaleImages({
						input: options.input,
						recursive: options.recursive,
						watermark: await getWatermarkPreference(options.watermark),
					}),
				),
			),
	)
	.addCommand(
		new Command("flip")
			.description("Flip images horizontally or vertically in batch.")
			.option("-i, --input <path>", "Path to an image file or a directory of images.", ".")
			.requiredOption("-d, --direction <direction>", "Flip direction ('horizontal' or 'vertical').")
			.option("-r, --recursive", "Recursively search for images in subdirectories.", false)
			.option("--no-watermark", "Remove dkutils watermark from processed images.")
			.action(async (options) =>
				print(
					await (await import("@package/image/index.js")).flipImages({
						input: options.input,
						direction: options.direction as "horizontal" | "vertical",
						recursive: options.recursive,
						watermark: await getWatermarkPreference(options.watermark),
					}),
				),
			),
	)
	.addCommand(
		new Command("remove-bg")
			.description("Automatically remove backgrounds from images using AI.")
			.option("-i, --input <path>", "Path to an image file or a directory of images.", ".")
			.option("-r, --recursive", "Recursively search for images in subdirectories.", false)
			.option("--no-watermark", "Remove dkutils watermark from processed images.")
			.action(async (options) =>
				print(
					await (await import("@package/image/index.js")).removeImageBackground({
						input: options.input,
						recursive: options.recursive,
						watermark: await getWatermarkPreference(options.watermark),
					}),
				),
			),
	)
	.addCommand(
		new Command("to-pdf")
			.description("Combine multiple images into a single PDF document.")
			.option("-i, --input <path>", "Path to an image file or a directory of images.", ".")
			.option("-r, --recursive", "Recursively search for images in subdirectories.", false)
			.option("--no-watermark", "Remove dkutils watermark from the resulting PDF.")
			.action(async (options) =>
				print(
					await (await import("@package/image/index.js")).convertImagesToPdf({
						input: options.input,
						recursive: options.recursive,
						watermark: await getWatermarkPreference(options.watermark),
					}),
				),
			),
	)
	.addCommand(
		new Command("to-base64")
			.description("Convert image files to Base64 encoded text strings.")
			.option("-i, --input <path>", "Path to an image file or a directory of images.", ".")
			.option("-r, --recursive", "Recursively search for images in subdirectories.", false)
			.option("-s, --stdout", "Print the Base64 string directly to the terminal.")
			.action(async (options) =>
				print(
					await (await import("@package/image/index.js")).imageToBase64({
						input: options.input,
						recursive: options.recursive,
						stdout: options.stdout,
					}),
				),
			),
	)
	.addCommand(
		new Command("png-to-jpg")
			.description("Quick conversion of PNG files to optimized JPEG format.")
			.option("-i, --input <path>", "Path to a PNG file or a directory of PNGs.", ".")
			.option("-r, --recursive", "Recursively search for images in subdirectories.", false)
			.option("--no-watermark", "Remove dkutils watermark from processed images.")
			.action(async (options) =>
				print(
					await (await import("@package/image/index.js")).pngToJpg({
						input: options.input,
						recursive: options.recursive,
						watermark: await getWatermarkPreference(options.watermark),
					}),
				),
			),
	)
	.addCommand(
		new Command("to-png")
			.description("Convert media files (like video frames or other images) to PNG.")
			.option("-i, --input <path>", "Path to a file or directory.", ".")
			.option("-r, --recursive", "Recursively search for images in subdirectories.", false)
			.action(async (options) =>
				print(
					await (await import("@package/image/index.js")).convertToPng({
						input: options.input,
						recursive: options.recursive,
					}),
				),
			),
	);

const pdfCommand = new Command("pdf").description(
	"Tools for PDF manipulation, conversion, and optimization.",
);
pdfCommand
	.addCommand(
		new Command("merge")
			.description("Merge multiple PDF files into one in the specified order.")
			.argument("<inputs...>", "Input PDF files followed by the desired output path.")
			.option("--no-watermark", "Remove dkutils watermark from the merged PDF.")
			.action(async (inputs, options) => {
				const outputPath = inputs[inputs.length - 1];
				const inputFiles = inputs.slice(0, -1);
				if (inputFiles.length === 0) {
					throw new Error("At least one input PDF file is required.");
				}
				print(
					await (await import("@package/pdf/index.js")).mergePdfs(
						inputFiles,
						outputPath,
						await getWatermarkPreference(options.watermark),
					),
				);
			}),
	)
	.addCommand(
		new Command("split")
			.description("Extract specific pages or ranges from a PDF file.")
			.option("-i, --input <path>", "Path to the source PDF file.", ".")
			.requiredOption("-r, --ranges <ranges>", "Page ranges to extract (e.g., '1-3,5').")
			.option("--no-watermark", "Remove dkutils watermark from the split PDF.")
			.action(async (options) => {
				const basename = path.basename(options.input, path.extname(options.input));
				const outputPath = path.join(process.cwd(), `${basename}-split.pdf`);
				print(
					await (await import("@package/pdf/index.js")).splitPdf(
						options.input,
						options.ranges,
						outputPath,
						await getWatermarkPreference(options.watermark),
					),
				);
			}),
	)
	.addCommand(
		new Command("compress")
			.description("Reduce PDF file size by compressing internal assets.")
			.option("-i, --input <path>", "Path to the source PDF file.", ".")
			.option(
				"-l, --level <level>",
				"Compression intensity: 'low', 'medium', or 'high' (default: 'medium').",
				"medium",
			)
			.option("--no-watermark", "Remove dkutils watermark from the compressed PDF.")
			.action(async (options) => {
				const basename = path.basename(options.input, path.extname(options.input));
				const outputPath = path.join(process.cwd(), `${basename}-compressed.pdf`);
				print(
					await (await import("@package/pdf/index.js")).compressPdf(
						options.input,
						outputPath,
						options.level as CompressionLevel,
						await getWatermarkPreference(options.watermark),
					),
				);
			}),
	)
	.addCommand(
		new Command("rotate")
			.description("Rotate all pages in a PDF file by a specific angle.")
			.option("-i, --input <path>", "Path to the source PDF file.", ".")
			.requiredOption(
				"-a, --angle <angle>",
				"Rotation angle in degrees (90, 180, 270).",
				parseInteger,
			)
			.option("--no-watermark", "Remove dkutils watermark from the rotated PDF.")
			.action(async (options) => {
				const basename = path.basename(options.input, path.extname(options.input));
				const outputPath = path.join(process.cwd(), `${basename}-rotated.pdf`);
				print(
					await (await import("@package/pdf/index.js")).rotatePdf(
						options.input,
						options.angle,
						outputPath,
						await getWatermarkPreference(options.watermark),
					),
				);
			}),
	)
	.addCommand(
		new Command("delete-pages")
			.description("Remove specific pages or ranges from a PDF file.")
			.option("-i, --input <path>", "Path to the source PDF file.", ".")
			.requiredOption("-r, --ranges <ranges>", "Page ranges to remove (e.g., '1-3,5').")
			.option("--no-watermark", "Remove dkutils watermark from the modified PDF.")
			.action(async (options) => {
				const basename = path.basename(options.input, path.extname(options.input));
				const outputPath = path.join(process.cwd(), `${basename}-modified.pdf`);
				print(
					await (await import("@package/pdf/index.js")).deletePdfPages(
						options.input,
						options.ranges,
						outputPath,
						await getWatermarkPreference(options.watermark),
					),
				);
			}),
	)
	.addCommand(
		new Command("to-text")
			.description("Extract all text content from a PDF file.")
			.option("-i, --input <path>", "Path to the source PDF file.", ".")
			.action(async (options) => {
				const basename = path.basename(options.input, path.extname(options.input));
				const outputPath = path.join(process.cwd(), `${basename}.txt`);
				print(await (await import("@package/pdf/index.js")).pdfToText(options.input, outputPath));
			}),
	)
	.addCommand(
		new Command("to-word")
			.description("Convert PDF content into an editable Microsoft Word document (.docx).")
			.option("-i, --input <path>", "Path to the source PDF file.", ".")
			.action(async (options) => {
				const basename = path.basename(options.input, path.extname(options.input));
				const outputPath = path.join(process.cwd(), `${basename}.docx`);
				print(await (await import("@package/pdf/index.js")).pdfToWord(options.input, outputPath));
			}),
	)
	.addCommand(
		new Command("to-excel")
			.description("Convert tabular PDF data into a Microsoft Excel spreadsheet (.xlsx).")
			.option("-i, --input <path>", "Path to the source PDF file.", ".")
			.action(async (options) => {
				const basename = path.basename(options.input, path.extname(options.input));
				const outputPath = path.join(process.cwd(), `${basename}.xlsx`);
				print(await (await import("@package/pdf/index.js")).pdfToExcel(options.input, outputPath));
			}),
	)
	.addCommand(
		new Command("text-to-pdf")
			.description("Create a PDF document from plain text or a text file.")
			.option("-i, --input <path>", "Path to a .txt or .md file.")
			.option("-t, --text <value>", "Inline text to convert.")
			.option("--no-watermark", "Remove dkutils watermark from the created PDF.")
			.action(async (options) => {
				const content = options.text ?? (options.input ? await readTextFile(options.input) : "");
				if (!content) throw new Error("Please provide either --input or --text content.");
				const outputPath = path.join(process.cwd(), "output.pdf");
				print(
					await (await import("@package/pdf/index.js")).textToPdf(
						content,
						outputPath,
						await getWatermarkPreference(options.watermark),
					),
				);
			}),
	);

const videoCommand = new Command("video").description(
	"Tools for video conversion, compression, and AI-powered editing.",
);
videoCommand
	.addCommand(
		new Command("remove-bg")
			.description(
				"Remove the background from each frame of a video file using AI (outputs transparent WebM).",
			)
			.option("-i, --input <path>", "Path to a video file or directory.", ".")
			.option(
				"--fps <number>",
				"Frames per second to sample (default: 1; higher = smoother but slower).",
				parseInteger,
			)
			.action(async (options) =>
				print(
					await (await import("@package/video/index.js")).removeVideoBackground({
						input: options.input,
						fps: options.fps,
					}),
				),
			),
	)
	.addCommand(
		new Command("mov-to-mp4")
			.description("Convert Apple QuickTime (.mov) videos to standard MP4 format.")
			.option("-i, --input <path>", "Path to a .mov file or directory.", ".")
			.action(async (options) =>
				print(
					await (await import("@package/video/index.js")).convertMovToMp4({
						input: options.input,
					}),
				),
			),
	)
	.addCommand(
		new Command("compress")
			.description("Reduce video file size by adjusting quality (using H.264/CRF).")
			.option("-i, --input <path>", "Path to a video file or directory.", ".")
			.option(
				"-q, --quality <number>",
				"Compression factor (18-35, lower is higher quality; default: 23).",
				parseInteger,
			)
			.action(async (options) =>
				print(
					await (await import("@package/video/index.js")).compressVideo({
						input: options.input,
						quality: options.quality,
					}),
				),
			),
	);

const youtubeCommand = new Command("youtube").description(
	"Tools for downloading and processing YouTube content.",
);
youtubeCommand.addCommand(
	new Command("download")
		.description("Download videos from YouTube in best available quality.")
		.requiredOption("-u, --url <url>", "Full YouTube video URL.")
		.action(async (options) =>
			print(
				await (await import("@package/video/index.js")).downloadYouTubeVideo(
					options.url,
					process.cwd(),
				),
			),
		),
);

const configCommand = new Command("config").description(
	"Manage dkutils CLI global settings and preferences.",
);
configCommand
	.command("watermark <on|off>")
	.description("Enable or disable the 'dkutils' watermark on all processed output globally.")
	.action(async (value) => {
		const { writeConfig } = await import("@package/utils/index.js");
		const watermark = value === "on";
		await writeConfig({ watermark });
		process.stdout.write(`Watermark preference saved: ${watermark ? "on" : "off"}\n`);
	});

program.addCommand(imageCommand);
program.addCommand(pdfCommand);
program.addCommand(videoCommand);
program.addCommand(youtubeCommand);
program.addCommand(configCommand);

if (process.argv.length <= 2) {
	process.stdout.write(`${renderCliBanner()}\n\n`);
	if (process.stdin.isTTY && process.stdout.isTTY) {
		await startInteractiveCli(print).catch((error: unknown) => {
			if (error instanceof Error && error.message.includes("User force closed")) {
				process.stdout.write("\nExiting dkutils. Goodbye!\n");
				process.exit(0);
			}
			process.stderr.write(`\n${handleUserError(error)}\n`);
			process.exit(1);
		});
	} else {
		program.outputHelp();
	}
} else {
	void program.parseAsync(process.argv).catch((error: unknown) => {
		process.stderr.write(`\n${handleUserError(error)}\n`);
		process.exitCode = 1;
	});
}

function parseInteger(value: string): number {
	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		throw new Error(`The value "${value}" is not a valid number. Please provide an integer.`);
	}
	return parsed;
}

async function readTextFile(filePath: string): Promise<string> {
	return readFile(path.resolve(filePath), "utf8");
}

function print(value: unknown): void {
	const { json } = program.opts<{ json?: boolean }>();
	if (json) {
		process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
		return;
	}

	if (typeof value === "string") {
		process.stdout.write(`${value}\n`);
		return;
	}

	if (Array.isArray(value)) {
		process.stdout.write(
			`${value
				.map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)))
				.join("\n")}\n`,
		);
		return;
	}

	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
