import { renderCliBanner } from "@package/branding.js";
import { DKU_BRAND, DKU_WATERMARK, capabilityGroups } from "@package/constants/index.js";
import { parsePageRanges } from "@package/pdf/index.js";
export type * from "@package/interfaces/index.js";

export const DKUTILS = {
	branding: {
		name: DKU_BRAND,
		watermark: DKU_WATERMARK,
		capabilityGroups,
		renderCliBanner,
	},
	image: {
		/**
		 * Decode a Base64 encoded image string and write it to a file.
		 * @param {object} options - Options for decoding and writing the image.
		 * @param {string} options.base64 - Base64 encoded image string.
		 * @param {string} [options.output] - Path to the output file.
		 * @param {string} [options.format] - Image format (png, jpeg, webp, tiff, gif, avif).
		 * @returns {Promise<string>} A promise that resolves with the path to the output image file.
		 */
		async base64ToImage(
			...args: Parameters<typeof import("@package/image/index.js").base64ToImage>
		) {
			return (await import("@package/image/index.js")).base64ToImage(...args);
		},
		/**
		 * Compress image files in batch.
		 * @param {object} options - An object containing the options for the compression.
		 * @param {string} options.input - The path to an image file or a directory of images.
		 * @param {boolean} options.recursive - Recursively search for images in subdirectories.
		 * @param {boolean} options.watermark - Include a dkutils watermark in the output images.
		 * @param {ImageFormat} options.format - The target format for the output images.
		 * @param {CompressionLevel} options.quality - The quality of the output images.
		 * @returns {Promise<string[]>} A promise that resolves with an array of paths to the output images.
		 */
		async compressImages(
			...args: Parameters<typeof import("@package/image/index.js").compressImages>
		) {
			return (await import("@package/image/index.js")).compressImages(...args);
		},
		/**
		 * Convert media files (like video frames or other images) to PNG.
		 * @param {object} options - An object containing the options for the conversion.
		 * @param {string} options.input - The path to an image file or a directory of images.
		 * @param {boolean} options.recursive - Recursively search for images in subdirectories.
		 * @returns {Promise<string[]>} A promise that resolves with an array of paths to the output images.
		 */
		async convertToPng(...args: Parameters<typeof import("@package/image/index.js").convertToPng>) {
			return (await import("@package/image/index.js")).convertToPng(...args);
		},
		/**
		 * Convert images between formats (PNG, JPEG, WebP, etc.) in batch.
		 * @param {object} options - An object containing the options for the conversion.
		 * @param {string} options.input - The path to an image file or a directory of images.
		 * @param {string} options.format - The target format of the output images.
		 * @param {boolean} options.recursive - Recursively search for images in subdirectories.
		 * @param {boolean} options.watermark - Add dkutils watermark to the output images.
		 * @returns {Promise<string[]>} A promise that resolves with an array of paths to the output images.
		 */
		async convertImages(
			...args: Parameters<typeof import("@package/image/index.js").convertImages>
		) {
			return (await import("@package/image/index.js")).convertImages(...args);
		},
		/**
		 * Convert a list of images into a single PDF file.
		 * @param {object} options - An object containing the options for the conversion.
		 * @param {string} options.input - The path to the image file or directory to convert.
		 * @param {string} options.output - The path to save the output PDF file.
		 * @param {string} options.format - The format of the output PDF file. (Default: "pdf")
		 * @param {number} options.width - The width of the output PDF file. (Default: 0)
		 * @param {number} options.height - The height of the output PDF file. (Default: 0)
		 * @param {string} options.pageRange - The range of pages to convert. (Default: "1")
		 * @param {boolean} options.recursive - Recursively search for images in subdirectories. (Default: false)
		 * @param {boolean} options.watermark - Add dkutils watermark to the output PDF file. (Default: true)
		 * @returns {Promise<string>} A promise that resolves with the path of the output PDF file.
		 */
		async convertImagesToPdf(
			...args: Parameters<typeof import("@package/image/index.js").convertImagesToPdf>
		) {
			return (await import("@package/image/index.js")).convertImagesToPdf(...args);
		},
		/**
		 * Crop images using specified coordinates and dimensions.
		 * @param {object} options - An object containing the options for the crop operation.
		 * @param {string} options.input - The path to the image file or directory to crop.
		 * @param {number} options.left - The horizontal start coordinate of the crop area.
		 * @param {number} options.top - The vertical start coordinate of the crop area.
		 * @param {number} options.width - The width of the crop area.
		 * @param {number} options.height - The height of the crop area.
		 * @param {boolean} [options.recursive] - Recursively search for images in subdirectories.
		 * @param {boolean} [options.watermark] - Remove dkutils watermark from processed images.
		 */
		async cropImages(...args: Parameters<typeof import("@package/image/index.js").cropImages>) {
			return (await import("@package/image/index.js")).cropImages(...args);
		},
		/**
		 * Flip images horizontally or vertically.
		 * @param {object} options - An object containing the options for the flip operation.
		 * @param {string} options.input - The path to the image file or directory to flip.
		 * @param {boolean} [options.recursive] - Recursively search for images in subdirectories.
		 * @param {string} options.direction - The direction of the flip operation. Must be 'horizontal' or 'vertical'.
		 * @returns {Promise<void>} A promise that resolves when the operation is completed.
		 */
		async flipImages(...args: Parameters<typeof import("@package/image/index.js").flipImages>) {
			return (await import("@package/image/index.js")).flipImages(...args);
		},
		/**
		 * Convert images to grayscale.
		 * @param {object} options - An object containing the options for the grayscale operation.
		 * @param {string} options.input - The path to the image file or directory to convert.
		 * @param {boolean} [options.recursive] - Recursively search for images in subdirectories.
		 * @returns {Promise<void>} A promise that resolves when the operation is completed.
		 */
		async grayscaleImages(
			...args: Parameters<typeof import("@package/image/index.js").grayscaleImages>
		) {
			return (await import("@package/image/index.js")).grayscaleImages(...args);
		},
		/**
		 * Convert an image to a Base64 encoded string.
		 * @param {object} options - An object containing the options for the image to Base64 conversion operation.
		 * @param {string} options.input - The path to the image file to convert.
		 * @param {boolean} [options.recursive] - Recursively search for images in subdirectories.
		 * @returns {Promise<string>} A promise that resolves with the Base64 encoded string of the image.
		 */
		async imageToBase64(
			...args: Parameters<typeof import("@package/image/index.js").imageToBase64>
		) {
			return (await import("@package/image/index.js")).imageToBase64(...args);
		},
		/**
		 * Quickly convert PNG files to optimized JPEG format.
		 * @param {object} options - An object containing the options for the PNG to JPEG conversion operation.
		 * @param {string} options.input - The path to the PNG file or directory containing the PNGs to convert.
		 * @param {boolean} [options.recursive] - Recursively search for images in subdirectories.
		 * @param {boolean} [options.watermark] - Add the dkutils watermark to the converted images.
		 * @returns {Promise<string>} A promise that resolves with the path to the output directory containing the converted images.
		 */
		async pngToJpg(...args: Parameters<typeof import("@package/image/index.js").pngToJpg>) {
			return (await import("@package/image/index.js")).pngToJpg(...args);
		},
		/**
		 * AI-powered background remover.
		 * Removes the background from each frame of a video file or images in a directory.
		 * @param {object} options - An object containing the options for the background removal operation.
		 * @param {string} options.input - The path to the video file or directory containing the images to remove the background from.
		 * @param {boolean} options.recursive - Recursively search for images in subdirectories.
		 * @param {boolean} options.watermark - Remove the dkutils watermark from the resulting images.
		 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of BatchResult objects.
		 */
		async removeImageBackground(
			...args: Parameters<typeof import("@package/image/index.js").removeImageBackground>
		) {
			return (await import("@package/image/index.js")).removeImageBackground(...args);
		},
		/**
		 * Resize images in batch.
		 * @param {object} options - An object containing the options for the resize operation.
		 * @param {string} options.input - The path to the directory containing the images to resize.
		 * @param {number} options.width - The width to resize the images to.
		 * @param {number} options.height - The height to resize the images to.
		 * @param {ImageFormat} options.format - The format to resize the images to.
		 * @param {CompressionLevel} options.quality - The compression level to use when resizing the images.
		 * @param {boolean} options.recursive - Whether to recursively search for images in subdirectories.
		 * @param {boolean} options.watermark - Whether to apply a watermark to the resized images.
		 * @returns {Promise<void>} A promise that resolves when the resize operation is complete.
		 */
		async resizeImages(...args: Parameters<typeof import("@package/image/index.js").resizeImages>) {
			return (await import("@package/image/index.js")).resizeImages(...args);
		},
	},
	pdf: {
		/**
		 * Compress a PDF file to reduce its file size.
		 * @param {string} input - The path to the source PDF file.
		 * @param {string} output - The output path of the compressed PDF file.
		 * @param {CompressionLevel} level - The compression level to use.
		 * @param {boolean} [watermark=false] - Add a watermark to the compressed PDF.
		 * @returns {Promise<void>}
		 */
		async compressPdf(...args: Parameters<typeof import("@package/pdf/index.js").compressPdf>) {
			return (await import("@package/pdf/index.js")).compressPdf(...args);
		},
		/**
		 * Remove specific pages or ranges from a PDF file.
		 * @param {string} input - The path to the source PDF file.
		 * @param {string} output - The output path of the modified PDF file.
		 * @param {string[]} ranges - Page ranges to remove (e.g., '1-3,5').
		 * @param {boolean} [watermark=false] - Add a watermark to the modified PDF file.
		 * @param {CompressionLevel} [compressionLevel=medium] - Compression level of the output PDF file.
		 */
		async deletePdfPages(
			...args: Parameters<typeof import("@package/pdf/index.js").deletePdfPages>
		) {
			return (await import("@package/pdf/index.js")).deletePdfPages(...args);
		},
		/**
		 * Merge multiple PDF files into one.
		 * @param {string[]} input - Paths to the source PDF files.
		 * @param {string} [output] - The output path of the merged PDF file.
		 * @param {boolean} [watermark=false] - Add a watermark to the merged PDF file.
		 * @param {CompressionLevel} [compressionLevel=medium] - Compression level of the output PDF file.
		 */
		async mergePdfs(...args: Parameters<typeof import("@package/pdf/index.js").mergePdfs>) {
			return (await import("@package/pdf/index.js")).mergePdfs(...args);
		},
		parsePageRanges,
		/**
		 * Convert a PDF file to an Excel file.
		 * @param {string} input - The path to the source PDF file.
		 * @param {string} [output] - The output path of the converted Excel file.
		 * @param {boolean} [watermark=false] - Add a watermark to the converted Excel file.
		 * @param {CompressionLevel} [compressionLevel="medium"] - The compression level of the converted Excel file.
		 */
		async pdfToExcel(...args: Parameters<typeof import("@package/pdf/index.js").pdfToExcel>) {
			return (await import("@package/pdf/index.js")).pdfToExcel(...args);
		},
		/**
		 * Extract all text content from a PDF file.
		 * @param {string} input - The path to the source PDF file.
		 * @param {string} [output] - The output path of the extracted text file.
		 * @param {boolean} [watermark=false] - Add a watermark to the extracted text file.
		 * @param {CompressionLevel} [compressionLevel="medium"] - The compression level for the extracted text file.
		 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of batch results, each containing the input file and the output text file.
		 */
		async pdfToText(...args: Parameters<typeof import("@package/pdf/index.js").pdfToText>) {
			return (await import("@package/pdf/index.js")).pdfToText(...args);
		},
		/**
		 * Convert a PDF document to a Word document (.docx).
		 * @param {string} input - The path to the source PDF file.
		 * @param {string} [output] - The output path of the converted Word document.
		 * @param {boolean} [watermark=false] - Add a watermark to the converted Word document.
		 * @param {CompressionLevel} [compressionLevel="medium"] - The compression level for the converted Word document.
		 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of batch results, each containing the input file and the output Word document.
		 */
		async pdfToWord(...args: Parameters<typeof import("@package/pdf/index.js").pdfToWord>) {
			return (await import("@package/pdf/index.js")).pdfToWord(...args);
		},
		/**
		 * Rotate all pages in a PDF document by a specific angle.
		 * @param {string} input - The path to the source PDF file.
		 * @param {number} angle - Rotation angle in degrees (90, 180, 270).
		 * @param {string} [output] - The output path of the rotated PDF document.
		 * @param {boolean} [watermark=false] - Add a watermark to the rotated PDF document.
		 * @param {CompressionLevel} [compressionLevel="medium"] - The compression level for the output PDF document.
		 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of batch results, each containing the input file and the output rotated PDF file.
		 */
		async rotatePdf(...args: Parameters<typeof import("@package/pdf/index.js").rotatePdf>) {
			return (await import("@package/pdf/index.js")).rotatePdf(...args);
		},
		/**
		 * Splits a PDF document into multiple pages or ranges.
		 * @param {string} input - The path to the source PDF file.
		 * @param {string} output - The output path of the split PDF documents.
		 * @param {string} pageRanges - Page ranges to split (e.g., '1-3,5').
		 * @param {boolean} [watermark=false] - Add a watermark to the split PDF documents.
		 * @param {CompressionLevel} [compressionLevel="medium"] - The compression level for the output PDF documents.
		 */
		async splitPdf(...args: Parameters<typeof import("@package/pdf/index.js").splitPdf>) {
			return (await import("@package/pdf/index.js")).splitPdf(...args);
		},
		/**
		 * Converts plain text into a PDF document.
		 * @param {string} text - The text content to convert.
		 * @param {string} [outputPath] - The output path of the created PDF document.
		 * @param {boolean} [watermark=false] - Add a watermark to the created PDF document.
		 * @param {CompressionLevel} [compressionLevel="medium"] - The compression level of the created PDF document.
		 * @returns {Promise<string>} - The output path of the created PDF document.
		 */
		async textToPdf(...args: Parameters<typeof import("@package/pdf/index.js").textToPdf>) {
			return (await import("@package/pdf/index.js")).textToPdf(...args);
		},
	},
	video: {
		/**
		 * Wraps the compressVideo function from video/index.js.
		 * See video/index.js for more details.
		 */
		async compressVideo(
			...args: Parameters<typeof import("@package/video/index.js").compressVideo>
		) {
			return (await import("@package/video/index.js")).compressVideo(...args);
		},
		/**
		 * Converts a MOV file to MP4.
		 * @param {string} url - URL of the MOV file.
		 * @param {string} outputDir - Path to the output directory.
		 * @param {Object} options - Options for the video conversion.
		 * @param {string} [options.format] - Format of the output video.
		 * @param {number} [options.quality] - Quality of the output video.
		 * @param {boolean} [options.watermark] - Whether to apply a watermark to the output video.
		 * @returns {Promise<string>} A promise that resolves with the path of the converted video.
		 * @throws {Error} If the video is not found, or if the converted file is invalid or too small.
		 */
		async convertMovToMp4(
			...args: Parameters<typeof import("@package/video/index.js").convertMovToMp4>
		) {
			return (await import("@package/video/index.js")).convertMovToMp4(...args);
		},
		/**
		 * Downloads a YouTube video.
		 * @param {string} videoId - The ID of the YouTube video to download.
		 * @param {string} outputDir - Path to the output directory.
		 * @param {Object} options - Options for the video download.
		 * @param {string} [options.format] - Format of the downloaded video.
		 * @param {number} [options.quality] - Quality of the downloaded video.
		 * @param {boolean} [options.watermark] - Whether to apply a watermark to the downloaded video.
		 * @returns {Promise<string>} A promise that resolves with the path of the downloaded video.
		 * @throws {Error} If the video is not found, or if the downloaded file is invalid or too small.
		 */
		async downloadYouTubeVideo(
			...args: Parameters<typeof import("@package/video/index.js").downloadYouTubeVideo>
		) {
			return (await import("@package/video/index.js")).downloadYouTubeVideo(...args);
		},
		/**
		 * Removes the background of a video.
		 * @param {string} url - URL of the video file.
		 * @param {string} outputDir - Path to the output directory.
		 * @param {Object} options - Options for the video background removal.
		 * @param {string} [options.format] - Format of the output video.
		 * @param {number} [options.quality] - Quality of the output video.
		 * @param {boolean} [options.watermark] - Whether to apply a watermark to the output video.
		 * @returns {Promise<BatchResult[]>} A promise that resolves with an array of batch results.
		 */
		async removeVideoBackground(
			...args: Parameters<typeof import("@package/video/index.js").removeVideoBackground>
		) {
			return (await import("@package/video/index.js")).removeVideoBackground(...args);
		},
	},
};

export default DKUTILS;
