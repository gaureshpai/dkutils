export type ImageFormat = "jpeg" | "jpg" | "png" | "webp" | "tiff" | "gif" | "avif" | "bmp";

export type FlipDirection = "horizontal" | "vertical";
export type CompressionLevel = "low" | "medium" | "high";

export interface BatchResult {
	input: string;
	output?: string;
	error?: string;
}

export interface FileTaskOptions {
	input: string;
	output?: string;
	watermark?: boolean;
	recursive?: boolean;
	stdout?: boolean;
}

/**
 * Options for batch image format conversion.
 */
export interface ConvertImagesOptions extends FileTaskOptions {
	format: ImageFormat;
}

/**
 * Options for image resizing.
 */
export interface ResizeImagesOptions extends FileTaskOptions {
	width: number;
	height: number;
}

/**
 * Options for image cropping.
 */
export interface CropImagesOptions extends FileTaskOptions {
	left: number;
	top: number;
	width: number;
	height: number;
}

/**
 * Options for lossy image compression.
 */
export interface CompressImagesOptions extends FileTaskOptions {
	quality?: number;
}

export interface YouTubeFormat {
	format_id: string;
	format_note?: string;
	resolution?: string;
	ext: string;
	vcodec: string;
	acodec: string;
	height?: number;
	abr?: number;
	format?: string;
}

export interface YouTubeVideoInfo {
	id: string;
	title: string;
	formats: YouTubeFormat[];
	duration?: number;
	uploader?: string;
}
