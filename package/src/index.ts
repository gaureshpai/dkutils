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
		async base64ToImage(
			...args: Parameters<typeof import("@package/image/index.js").base64ToImage>
		) {
			return (await import("@package/image/index.js")).base64ToImage(...args);
		},
		async compressImages(
			...args: Parameters<typeof import("@package/image/index.js").compressImages>
		) {
			return (await import("@package/image/index.js")).compressImages(...args);
		},
		async convertToPng(...args: Parameters<typeof import("@package/image/index.js").convertToPng>) {
			return (await import("@package/image/index.js")).convertToPng(...args);
		},
		async convertImages(
			...args: Parameters<typeof import("@package/image/index.js").convertImages>
		) {
			return (await import("@package/image/index.js")).convertImages(...args);
		},
		async convertImagesToPdf(
			...args: Parameters<typeof import("@package/image/index.js").convertImagesToPdf>
		) {
			return (await import("@package/image/index.js")).convertImagesToPdf(...args);
		},
		async cropImages(...args: Parameters<typeof import("@package/image/index.js").cropImages>) {
			return (await import("@package/image/index.js")).cropImages(...args);
		},
		async flipImages(...args: Parameters<typeof import("@package/image/index.js").flipImages>) {
			return (await import("@package/image/index.js")).flipImages(...args);
		},
		async grayscaleImages(
			...args: Parameters<typeof import("@package/image/index.js").grayscaleImages>
		) {
			return (await import("@package/image/index.js")).grayscaleImages(...args);
		},
		async imageToBase64(
			...args: Parameters<typeof import("@package/image/index.js").imageToBase64>
		) {
			return (await import("@package/image/index.js")).imageToBase64(...args);
		},
		async pngToJpg(...args: Parameters<typeof import("@package/image/index.js").pngToJpg>) {
			return (await import("@package/image/index.js")).pngToJpg(...args);
		},
		async removeImageBackground(
			...args: Parameters<typeof import("@package/image/index.js").removeImageBackground>
		) {
			return (await import("@package/image/index.js")).removeImageBackground(...args);
		},
		async resizeImages(...args: Parameters<typeof import("@package/image/index.js").resizeImages>) {
			return (await import("@package/image/index.js")).resizeImages(...args);
		},
	},
	pdf: {
		async compressPdf(...args: Parameters<typeof import("@package/pdf/index.js").compressPdf>) {
			return (await import("@package/pdf/index.js")).compressPdf(...args);
		},
		async deletePdfPages(
			...args: Parameters<typeof import("@package/pdf/index.js").deletePdfPages>
		) {
			return (await import("@package/pdf/index.js")).deletePdfPages(...args);
		},
		async mergePdfs(...args: Parameters<typeof import("@package/pdf/index.js").mergePdfs>) {
			return (await import("@package/pdf/index.js")).mergePdfs(...args);
		},
		parsePageRanges,
		async pdfToExcel(...args: Parameters<typeof import("@package/pdf/index.js").pdfToExcel>) {
			return (await import("@package/pdf/index.js")).pdfToExcel(...args);
		},
		async pdfToText(...args: Parameters<typeof import("@package/pdf/index.js").pdfToText>) {
			return (await import("@package/pdf/index.js")).pdfToText(...args);
		},
		async pdfToWord(...args: Parameters<typeof import("@package/pdf/index.js").pdfToWord>) {
			return (await import("@package/pdf/index.js")).pdfToWord(...args);
		},
		async rotatePdf(...args: Parameters<typeof import("@package/pdf/index.js").rotatePdf>) {
			return (await import("@package/pdf/index.js")).rotatePdf(...args);
		},
		async splitPdf(...args: Parameters<typeof import("@package/pdf/index.js").splitPdf>) {
			return (await import("@package/pdf/index.js")).splitPdf(...args);
		},
		async textToPdf(...args: Parameters<typeof import("@package/pdf/index.js").textToPdf>) {
			return (await import("@package/pdf/index.js")).textToPdf(...args);
		},
	},
	video: {
		async compressVideo(
			...args: Parameters<typeof import("@package/video/index.js").compressVideo>
		) {
			return (await import("@package/video/index.js")).compressVideo(...args);
		},
		async convertMovToMp4(
			...args: Parameters<typeof import("@package/video/index.js").convertMovToMp4>
		) {
			return (await import("@package/video/index.js")).convertMovToMp4(...args);
		},
		async downloadYouTubeVideo(
			...args: Parameters<typeof import("@package/video/index.js").downloadYouTubeVideo>
		) {
			return (await import("@package/video/index.js")).downloadYouTubeVideo(...args);
		},
		async removeVideoBackground(
			...args: Parameters<typeof import("@package/video/index.js").removeVideoBackground>
		) {
			return (await import("@package/video/index.js")).removeVideoBackground(...args);
		},
	},
};

export default DKUTILS;
