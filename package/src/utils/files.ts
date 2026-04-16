import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

import type { BatchResult } from "@package/interfaces/index.js";

/**
 * Recursively creates a directory if it does not exist.
 * @param dirPath The path to the directory to ensure.
 * @returns A promise that resolves to the ensured directory path.
 */
export async function ensureDirectory(dirPath: string): Promise<string> {
	await mkdir(dirPath, { recursive: true });
	return dirPath;
}

/**
 * Checks if the given path is a directory.
 * @param targetPath The path to the file system object to check.
 * @returns A promise that resolves to a boolean indicating whether the target path is a directory.
 */
export async function isDirectory(targetPath: string): Promise<boolean> {
	const targetStat = await stat(targetPath);
	return targetStat.isDirectory();
}

/**
 * Recursively searches for files in the given directory and returns an array of absolute paths to the found files.
 * @param inputPath The path to the directory to search in.
 * @param extensions An optional array of file extensions to filter by.
 * @param recursive An optional boolean indicating whether to search recursively in subdirectories.
 * @returns A promise that resolves to an array of absolute paths to the found files.
 */
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

/**
 * Collects the direct children of the given directory.
 * The function returns a promise that resolves to an array of absolute paths to the direct children.
 * The returned array is sorted alphabetically.
 * @param inputPath The path to the directory to collect children from.
 * @returns A promise that resolves to an array of absolute paths to the direct children.
 */
export async function collectDirectChildren(inputPath: string): Promise<string[]> {
	const entries = await readdir(path.resolve(inputPath), {
		withFileTypes: true,
	});
	return entries
		.filter((entry) => entry.isFile())
		.map((entry) => path.resolve(inputPath, entry.name))
		.sort();
}

/**
 * Replaces the extension of a file path with the given extension.
 * @param filePath The file path to replace the extension of.
 * @param extension The new extension to replace the old one with.
 * @returns A new file path with the replaced extension.
 * @example
 * replaceExtension("path/to/file.txt", "md") // Returns "path/to/file.md"
 */
export function replaceExtension(filePath: string, extension: string): string {
	return `${path.join(path.dirname(filePath), path.parse(filePath).name)}.${extension.replace(/^\./, "")}`;
}

/**
 * Returns the default output directory path.
 * The default output directory is the current working directory of the process.
 * @param _inputPath The input path (not used in this function).
 * @returns The default output directory path.
 */
export function defaultOutputDir(_inputPath: string): string {
	return process.cwd();
}

/**
 * Writes the given buffer to a file at the given output path.
 * The function will create any missing directories in the output path.
 * @param outputPath The path to the file to write the buffer to.
 * @param buffer The buffer to write to the file.
 * @returns A promise that resolves to the absolute path to the written file.
 */
export async function writeBuffer(outputPath: string, buffer: Buffer): Promise<string> {
	const absoluteOutput = path.resolve(outputPath);
	await ensureDirectory(path.dirname(absoluteOutput));
	await writeFile(absoluteOutput, buffer);
	return absoluteOutput;
}

/**
 * Writes the given string content to a file at the given output path.
 * The function will create any missing directories in the output path.
 * @param outputPath The path to the file to write the content to.
 * @param content The string content to write to the file.
 * @returns A promise that resolves to the absolute path to the written file.
 */
export async function writeText(outputPath: string, content: string): Promise<string> {
	return writeBuffer(outputPath, Buffer.from(content, "utf8"));
}

/**
 * Reads the content of a text file at the given input path and returns a promise that resolves to the file content.
 * @param inputPath The path to the text file to read.
 * @returns A promise that resolves to the content of the text file.
 */
export async function readText(inputPath: string): Promise<string> {
	return readFile(path.resolve(inputPath), "utf8");
}

/**
 * Ensures the given output path is a valid file path.
 * If the given output path is a directory, it will append the default name to the path.
 * If the given output path doesn't exist, it will assume it's a file path and return it as is.
 * @param outputPath The path to ensure is a valid file path.
 * @param defaultName The default name to append to the output path if it's a directory.
 * @returns A promise that resolves to the ensured output path.
 */
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

/**
 * Maps an input file path to an output file path with the given suffix and extension.
 * The function will join the given output directory with the input file's name, suffix, and extension.
 * If the extension starts with a period (.), it will be removed.
 * @param inputFile The input file path to map.
 * @param outputDir The output directory path.
 * @param suffix The suffix to append to the input file's name.
 * @param extension The extension to append to the input file's name.
 * @returns The mapped output file path.
 */
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

/**
 * Summarizes the given batch of results into a human-readable string.
 * The function will return a string containing each input file mapped to its corresponding output file.
 * If the given batch of results is empty, the function will return a string indicating no files were processed.
 * @param results The batch of results to summarize.
 * @returns A human-readable string summarizing the given batch of results.
 */
export function summarizeBatch(results: BatchResult[]): string {
	if (results.length === 0) {
		return "No files were processed.";
	}

	return results.map((result) => `${result.input} -> ${result.output}`).join("\n");
}
