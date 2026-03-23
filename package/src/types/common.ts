export type ImageFormat = "jpeg" | "jpg" | "png" | "webp" | "tiff" | "gif" | "avif";

export type FlipDirection = "horizontal" | "vertical";
export type CompressionLevel = "low" | "medium" | "high";

export interface BatchResult {
	input: string;
	output: string;
}

export interface FileTaskOptions {
	input: string;
	output?: string;
	watermark?: boolean;
}
