import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

import type { BatchResult } from "@package/interfaces/index.js";

export async function ensureDirectory(dirPath: string): Promise<string> {
	await mkdir(dirPath, { recursive: true });
	return dirPath;
}

export async function isDirectory(targetPath: string): Promise<boolean> {
	const targetStat = await stat(targetPath);
	return targetStat.isDirectory();
}

export async function collectFiles(
	inputPath: string,
	extensions?: string[],
	recursive = false,
): Promise<string[]> {
	const absoluteInput = path.resolve(inputPath);
	const targetStat = await stat(absoluteInput);

	if (targetStat.isFile()) {
		return [absoluteInput];
	}

	const patterns =
		extensions && extensions.length > 0
			? extensions.map((extension) => (recursive ? `**/*${extension}` : `*${extension}`))
			: [recursive ? "**/*" : "*"];

	const files = await fg(patterns, {
		cwd: absoluteInput,
		onlyFiles: true,
		absolute: true,
		caseSensitiveMatch: false,
		ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"],
	});

	return files.sort();
}

export async function collectDirectChildren(inputPath: string): Promise<string[]> {
	const entries = await readdir(path.resolve(inputPath), {
		withFileTypes: true,
	});
	return entries
		.filter((entry) => entry.isFile())
		.map((entry) => path.resolve(inputPath, entry.name))
		.sort();
}

export function replaceExtension(filePath: string, extension: string): string {
	return `${path.join(path.dirname(filePath), path.parse(filePath).name)}.${extension.replace(/^\./, "")}`;
}

export function defaultOutputDir(_inputPath: string): string {
	return process.cwd();
}

export async function writeBuffer(outputPath: string, buffer: Buffer): Promise<string> {
	const absoluteOutput = path.resolve(outputPath);
	await ensureDirectory(path.dirname(absoluteOutput));
	await writeFile(absoluteOutput, buffer);
	return absoluteOutput;
}

export async function writeText(outputPath: string, content: string): Promise<string> {
	return writeBuffer(outputPath, Buffer.from(content, "utf8"));
}

export async function readText(inputPath: string): Promise<string> {
	return readFile(path.resolve(inputPath), "utf8");
}

export async function ensureFileOutputPath(
	outputPath: string,
	defaultName: string,
): Promise<string> {
	try {
		const stats = await stat(path.resolve(outputPath));
		if (stats.isDirectory()) {
			return path.join(outputPath, defaultName);
		}
	} catch {
		// Path doesn't exist, assume it's a file path
	}
	return outputPath;
}

export function mapOutputPath(
	inputFile: string,
	outputDir: string,
	suffix: string,
	extension: string,
): string {
	const parsed = path.parse(inputFile);
	return path.join(
		path.resolve(outputDir),
		`${parsed.name}${suffix}.${extension.replace(/^\./, "")}`,
	);
}

export function summarizeBatch(results: BatchResult[]): string {
	if (results.length === 0) {
		return "No files were processed.";
	}

	return results.map((result) => `${result.input} -> ${result.output}`).join("\n");
}
