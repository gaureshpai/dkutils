import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import type {
	BatchResult,
	FileTaskOptions,
	YouTubeFormat,
	YouTubeVideoInfo,
} from "@package/interfaces/index.js";
import {
	collectFiles,
	defaultOutputDir,
	ensureDirectory,
	ffmpegPath,
	mapOutputPath,
	runFfmpeg,
} from "@package/utils/index.js";
import { Innertube, type Types, Utils } from "youtubei.js";
import ytDlpPath from "yt-dlp-static";

type ICacheConstructor = Types.ICacheConstructor;
type BuildScriptResult = Types.BuildScriptResult;
type VMPrimative = Types.VMPrimative;

class NodeCache {
	persistent_directory: string;
	constructor(persistent = false, persistent_directory?: string) {
		this.persistent_directory = persistent_directory || path.resolve(os.tmpdir(), "youtubei.js");
	}
	async get(key: string) {
		const file = path.resolve(this.persistent_directory, key);
		try {
			const data = await fs.readFile(file);
			return data.buffer;
		} catch {
			return undefined;
		}
	}
	async set(key: string, value: ArrayBuffer) {
		await fs.mkdir(this.persistent_directory, { recursive: true });
		const file = path.resolve(this.persistent_directory, key);
		await fs.writeFile(file, new Uint8Array(value));
	}
	async remove(key: string) {
		const file = path.resolve(this.persistent_directory, key);
		try {
			await fs.unlink(file);
		} catch {
			// Ignore
		}
	}
}

type EvalResult = { [key: string]: unknown } | undefined;

Utils.Platform.load({
	runtime: "node",
	server: true,
	Cache: NodeCache as unknown as ICacheConstructor,
	sha1Hash: async (data: string) => {
		return crypto.createHash("sha1").update(data).digest("hex");
	},
	uuidv4() {
		return crypto.randomUUID();
	},
	eval: (data: BuildScriptResult, env: Record<string, VMPrimative>): EvalResult => {
		const fn = new vm.Script(`
			(function(process) {
				${data.output}
			})
		`);
		const run = fn.runInNewContext(env);
		return run(data.output);
	},
	fetch: globalThis.fetch,
	Request: globalThis.Request,
	Response: globalThis.Response,
	Headers: globalThis.Headers,
	FormData: globalThis.FormData,
	File: globalThis.File,
	ReadableStream: globalThis.ReadableStream as unknown as typeof globalThis.ReadableStream,
	CustomEvent: globalThis.CustomEvent as unknown as typeof globalThis.CustomEvent,
});

function extractVideoId(url: string): string {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
		/^[a-zA-Z0-9_-]{11}$/,
	];
	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1];
	}
	return url;
}

async function validateFile(filePath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(filePath);
		return stats.size > 5000;
	} catch {
		return false;
	}
}

async function cleanupFiles(filePaths: string[]): Promise<void> {
	for (const basePath of filePaths) {
		const absolutePath = path.resolve(basePath);
		const dir = path.dirname(absolutePath);
		const name = path.parse(absolutePath).name;

		try {
			const files = await fs.readdir(dir);
			for (const file of files) {
				const fullPath = path.join(dir, file);
				// Delete anything that starts with the same name but has a different extension
				// or is a temporary/part file, except the final .mp4
				if (file.startsWith(name) && !file.endsWith(".mp4")) {
					await fs.unlink(fullPath);
				} else if (file.endsWith(".part") || file.endsWith(".ytdl")) {
					await fs.unlink(fullPath);
				}
			}
		} catch {
			// Ignore cleanup errors
		}
	}
}

async function getExpectedFilename(videoId: string, format: string): Promise<string> {
	const args = [
		`https://youtube.com/watch?v=${videoId}`,
		"-f",
		format,
		"--get-filename",
		"--merge-output-format",
		"mp4",
		"-o",
		"%(title)s.%(ext)s",
		"--no-playlist",
	];
	const rawName = await runYtDlpCommand(args);
	return rawName.trim().replace(/\.[^.]+$/, ".mp4");
}

/**
 * Remove the background from every sampled frame of one or more video files.
 *
 * For each input video:
 *  1. ffmpeg extracts frames at `fps` (default 1 fps) as PNG files in a temp dir.
 *  2. Each PNG frame is processed with \`@imgly/background-removal-node\`.
 *  3. The processed PNG frames are reassembled into a WebM file (VP9 + alpha
 *     channel) so the background is truly transparent.
 *
 * Note: Processing time scales with video duration × fps.  Use fps=1 for quick
 * previews; increase fps for smoother output.
 */
export async function removeVideoBackground(
	options: FileTaskOptions & { fps?: number },
): Promise<BatchResult[]> {
	const VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".avi", ".webm"];
	const files = await collectFiles(options.input, VIDEO_EXTENSIONS);
	const outputDir = path.resolve(options.output ?? defaultOutputDir(options.input));
	const fps = options.fps ?? 1;
	const results: BatchResult[] = [];

	// Lazy-import so the ONNX model is only initialised when called.
	const { removeBackground } = await import("@imgly/background-removal-node");
	const config = {
		publicPath: import.meta
			.resolve("@imgly/background-removal-node")
			.replace(/index\.[mc]?js$/, ""),
	};

	for (const file of files) {
		const framesDir = path.join(os.tmpdir(), `dkutils-vframes-${Date.now()}`);
		try {
			await ensureDirectory(framesDir);

			// ── Step 1: Extract frames ──────────────────────────────────────────
			await runFfmpeg([
				"-y",
				"-i",
				file,
				"-vf",
				`fps=${fps}`,
				"-q:v",
				"1",
				path.join(framesDir, "frame_%06d.png"),
			]);

			// ── Step 2: Remove background from each frame ────────────────────
			const allFiles = await fs.readdir(framesDir);
			const frames = allFiles.filter((f) => f.endsWith(".png")).sort();

			for (const frame of frames) {
				const framePath = path.join(framesDir, frame);
				const resultBlob = await removeBackground(framePath, config);
				const arrayBuffer = await resultBlob.arrayBuffer();
				await fs.writeFile(framePath, Buffer.from(arrayBuffer));
			}

			// ── Step 3: Reassemble as WebM with VP9 alpha channel ────────────
			const outputPath = mapOutputPath(file, outputDir, "-no-bg", "webm");
			await runFfmpeg([
				"-y",
				"-framerate",
				fps.toString(),
				"-i",
				path.join(framesDir, "frame_%06d.png"),
				"-c:v",
				"libvpx-vp9",
				"-pix_fmt",
				"yuva420p",
				"-b:v",
				"0",
				"-crf",
				"30",
				"-auto-alt-ref",
				"0",
				outputPath,
			]);

			results.push({ input: file, output: outputPath });
		} catch (error) {
			results.push({
				input: file,
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			await fs.rm(framesDir, { recursive: true, force: true }).catch(() => {});
		}
	}
	return results;
}

export async function convertMovToMp4(options: FileTaskOptions): Promise<BatchResult[]> {
	const files = await collectFiles(options.input, [".mov"]);
	const outputDir = path.resolve(options.output ?? defaultOutputDir(options.input));
	const results: BatchResult[] = [];

	for (const file of files) {
		const outputPath = mapOutputPath(file, outputDir, "", "mp4");
		await runFfmpeg([
			"-y",
			"-i",
			file,
			"-c:v",
			"libx264",
			"-crf",
			"18",
			"-preset",
			"medium",
			"-c:a",
			"aac",
			outputPath,
		]);
		results.push({ input: file, output: outputPath });
	}

	return results;
}

export async function compressVideo(
	options: FileTaskOptions & { quality?: number },
): Promise<BatchResult[]> {
	const files = await collectFiles(options.input, [".mp4", ".mov", ".mkv", ".avi", ".webm"]);
	const outputDir = path.resolve(options.output ?? defaultOutputDir(options.input));
	const crf = options.quality ?? 23; // 18-28 is standard for x264
	const results: BatchResult[] = [];

	for (const file of files) {
		const outputPath = mapOutputPath(file, outputDir, "-compressed", "mp4");
		await runFfmpeg([
			"-y",
			"-i",
			file,
			"-c:v",
			"libx264",
			"-crf",
			crf.toString(),
			"-preset",
			"medium",
			"-c:a",
			"aac",
			"-b:a",
			"128k",
			outputPath,
		]);
		results.push({ input: file, output: outputPath });
	}

	return results;
}

export async function getYouTubeInfo(url: string): Promise<YouTubeVideoInfo> {
	const videoId = extractVideoId(url);
	const ytdlpBin = ytDlpPath;

	return new Promise((resolve, reject) => {
		execFile(
			ytdlpBin,
			[`https://youtube.com/watch?v=${videoId}`, "--dump-json", "--no-playlist"],
			(err, stdout, stderr) => {
				if (err) {
					return reject(new Error(stderr || err.message));
				}
				try {
					resolve(JSON.parse(stdout));
				} catch {
					reject(new Error("Failed to parse video information"));
				}
			},
		);
	});
}

export async function downloadYouTubeVideo(
	url: string,
	outputDir: string,
	options: { format?: string } = {},
): Promise<string> {
	const absoluteOutput = path.resolve(outputDir);
	await ensureDirectory(absoluteOutput);

	const videoId = extractVideoId(url);

	try {
		console.info("Downloading YouTube video with yt-dlp...");
		const result = await downloadWithYtDlp(videoId, absoluteOutput, options);
		// Success! Clean up any residues immediately
		await cleanupFiles([result]);
		return result;
	} catch (err) {
		console.warn(`yt-dlp failed: ${(err as Error).message}`);

		// If the file actually exists and is valid despite the error, return it
		// This prevents false-failure retries
		const expectedName = await getExpectedFilename(videoId, options.format || "best").catch(
			() => "",
		);
		if (expectedName) {
			const possiblePath = path.join(absoluteOutput, expectedName.replace(/[<>:"/\\|?*]/g, "_"));
			if (await validateFile(possiblePath)) {
				await cleanupFiles([possiblePath]);
				return possiblePath;
			}
		}

		console.info("Attempting to update yt-dlp...");
		try {
			await runYtDlpCommand(["-U"]);
			console.info("yt-dlp updated, retrying download...");
			const result = await downloadWithYtDlp(videoId, absoluteOutput, options);
			await cleanupFiles([result]);
			return result;
		} catch (updateErr) {
			console.warn(`Failed to update yt-dlp: ${(updateErr as Error).message}`);
		}

		console.info("Trying youtubei.js fallback...");
		try {
			const result = await downloadWithYoutubei(videoId, absoluteOutput);
			await cleanupFiles([result]);
			return result;
		} catch (ytErr) {
			console.warn(`youtubei.js failed: ${(ytErr as Error).message}`);
		}

		console.error("\n[Error] All download methods failed.");
		console.error("Please check your internet connection and try again later.\n");
		throw new Error("Failed to download YouTube video after trying all methods");
	}
}

async function runYtDlpCommand(args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(ytDlpPath, args, (err, stdout, stderr) => {
			if (err) {
				return reject(new Error(stderr || err.message));
			}
			resolve(stdout);
		});
	});
}

async function downloadWithYoutubei(videoId: string, outputDir: string): Promise<string> {
	const yt = await Innertube.create();
	const info = await yt.getBasicInfo(videoId);

	if (!info) {
		throw new Error("Video not found");
	}

	const title = info.basic_info.title?.replace(/[<>:"/\\|?*]/g, "_") ?? "video";
	const outputPath = path.join(outputDir, `${title}.mp4`);

	console.info("Downloading... (this may take a moment)");

	const stream = await yt.download(videoId, {
		type: "video+audio",
		quality: "best",
		format: "mp4",
	});

	const writer = createWriteStream(outputPath);

	const reader = stream.getReader();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			writer.write(value);
		}
	} finally {
		writer.end();
	}

	if (!(await validateFile(outputPath))) {
		await cleanupFiles([outputPath]);
		throw new Error("Downloaded file is invalid or too small");
	}

	return outputPath;
}

async function downloadWithYtDlp(
	videoId: string,
	outputDir: string,
	options: { format?: string } = {},
): Promise<string> {
	await ensureDirectory(outputDir);

	// Get the exact filename yt-dlp will use
	const format = options.format || "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
	const rawFilename = await getExpectedFilename(videoId, format);
	const safeFilename = rawFilename.replace(/[<>:"/\\|?*]/g, "_");
	const outputPath = path.join(outputDir, safeFilename);

	await runYtDlpWithProgress(videoId, outputPath, format);

	if (!(await validateFile(outputPath))) {
		// Try one more time to find it in case the naming was slightly different
		const files = await fs.readdir(outputDir);
		const baseName = path.parse(safeFilename).name;
		const found = files.find((f) => f.startsWith(baseName) && f.endsWith(".mp4"));

		if (found) {
			const foundPath = path.join(outputDir, found);
			if (await validateFile(foundPath)) return foundPath;
		}

		throw new Error("Downloaded file is invalid or too small");
	}

	return outputPath;
}

async function runYtDlpWithProgress(
	videoId: string,
	outputPath: string,
	format?: string,
): Promise<void> {
	return new Promise((resolve, reject) => {
		console.info("Downloading... (this may take a moment depending on quality)");

		const args = [
			`https://youtube.com/watch?v=${videoId}`,
			"-f",
			format || "bestvideo+bestaudio/best",
			"--merge-output-format",
			"mp4",
			"-o",
			outputPath,
			"--no-playlist",
			"--ffmpeg-location",
			ffmpegPath,
			"--no-progress", // Disable yt-dlp's own progress output
		];

		const proc = spawn(ytDlpPath, args, { shell: false });

		let stderr = "";

		proc.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(stderr || `yt-dlp exited with code ${code ?? -1}`));
			}
		});

		proc.on("error", (err) => {
			reject(err);
		});
	});
}
