import path from "node:path";

/**
 * Custom error class for dkutils CLI to provide user-friendly error messages.
 */
export class DkUtilsError extends Error {
	constructor(
		message: string,
		public readonly suggestion?: string,
	) {
		super(message);
		this.name = "DkUtilsError";
	}
}

interface NodeError extends Error {
	code?: string;
	path?: string;
}

/**
 * Handles common errors and returns a user-friendly message.
 */
export function handleUserError(error: unknown): string {
	if (error instanceof DkUtilsError) {
		return `\nError: ${error.message}${error.suggestion ? `\nSuggestion: ${error.suggestion}` : ""}`;
	}

	const err = error as NodeError;

	// File system errors
	if (err.code === "ENOENT") {
		return `\nError: File or directory not found: ${err.path}\nSuggestion: Please check the path and try again.`;
	}

	if (err.code === "EACCES" || err.code === "EPERM") {
		return `\nError: Permission denied: ${err.path}\nSuggestion: Try running with higher privileges or check folder permissions.`;
	}

	// Library specific errors
	const message = err.message || String(error);

	if (message.includes("ffmpeg") && message.includes("not found")) {
		return "\nError: FFmpeg is not installed.\nSuggestion: This tool requires FFmpeg for media processing. Please install it and add it to your PATH.";
	}

	if (message.includes("Invalid page range")) {
		return `\nError: ${message}\nSuggestion: Example of valid range: "1-3,5"`;
	}

	if (message.includes("Could not load document")) {
		return "\nError: Could not load the PDF document.\nSuggestion: The file might be corrupted or password-protected.";
	}

	if (message.includes("Unsupported image type")) {
		return "\nError: This image format is not supported.\nSuggestion: Supported formats include: PNG, JPEG, WebP, TIFF, GIF, AVIF.";
	}

	// Fallback for developer-friendly errors
	return `\nSomething went wrong: ${message}\nSuggestion: If this persists, please report the issue.`;
}

/**
 * Wraps a promise to catch errors and return a user-friendly message.
 */
export async function wrapAction<T>(promise: Promise<T>): Promise<T> {
	try {
		return await promise;
	} catch (error) {
		throw new Error(handleUserError(error));
	}
}
