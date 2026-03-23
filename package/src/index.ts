import { renderCliBanner } from "./branding.js";
import { DKU_BRAND, DKU_WATERMARK, capabilityGroups } from "./constants/index.js";
import { parsePageRanges } from "./pdf/index.js";

export type * from "./interfaces/index.js";

export const DKUTILS = {
	branding: {
		name: DKU_BRAND,
		watermark: DKU_WATERMARK,
		capabilityGroups,
		renderCliBanner,
	},
	image: {
		async base64ToImage(...args: Parameters<typeof import("./image/index.js").base64ToImage>) {
			return (await import("./image/index.js")).base64ToImage(...args);
		},
		async compressImages(...args: Parameters<typeof import("./image/index.js").compressImages>) {
			return (await import("./image/index.js")).compressImages(...args);
		},
		async convertToPng(...args: Parameters<typeof import("./image/index.js").convertToPng>) {
			return (await import("./image/index.js")).convertToPng(...args);
		},
		async convertImages(...args: Parameters<typeof import("./image/index.js").convertImages>) {
			return (await import("./image/index.js")).convertImages(...args);
		},
		async convertImagesToPdf(
			...args: Parameters<typeof import("./image/index.js").convertImagesToPdf>
		) {
			return (await import("./image/index.js")).convertImagesToPdf(...args);
		},
		async cropImages(...args: Parameters<typeof import("./image/index.js").cropImages>) {
			return (await import("./image/index.js")).cropImages(...args);
		},
		async flipImages(...args: Parameters<typeof import("./image/index.js").flipImages>) {
			return (await import("./image/index.js")).flipImages(...args);
		},
		async grayscaleImages(...args: Parameters<typeof import("./image/index.js").grayscaleImages>) {
			return (await import("./image/index.js")).grayscaleImages(...args);
		},
		async imageToBase64(...args: Parameters<typeof import("./image/index.js").imageToBase64>) {
			return (await import("./image/index.js")).imageToBase64(...args);
		},
		async pngToJpg(...args: Parameters<typeof import("./image/index.js").pngToJpg>) {
			return (await import("./image/index.js")).pngToJpg(...args);
		},
		async removeImageBackground(
			...args: Parameters<typeof import("./image/index.js").removeImageBackground>
		) {
			return (await import("./image/index.js")).removeImageBackground(...args);
		},
		async resizeImages(...args: Parameters<typeof import("./image/index.js").resizeImages>) {
			return (await import("./image/index.js")).resizeImages(...args);
		},
	},
	pdf: {
		async compressPdf(...args: Parameters<typeof import("./pdf/index.js").compressPdf>) {
			return (await import("./pdf/index.js")).compressPdf(...args);
		},
		async deletePdfPages(...args: Parameters<typeof import("./pdf/index.js").deletePdfPages>) {
			return (await import("./pdf/index.js")).deletePdfPages(...args);
		},
		async mergePdfs(...args: Parameters<typeof import("./pdf/index.js").mergePdfs>) {
			return (await import("./pdf/index.js")).mergePdfs(...args);
		},
		parsePageRanges,
		async pdfToExcel(...args: Parameters<typeof import("./pdf/index.js").pdfToExcel>) {
			return (await import("./pdf/index.js")).pdfToExcel(...args);
		},
		async pdfToText(...args: Parameters<typeof import("./pdf/index.js").pdfToText>) {
			return (await import("./pdf/index.js")).pdfToText(...args);
		},
		async pdfToWord(...args: Parameters<typeof import("./pdf/index.js").pdfToWord>) {
			return (await import("./pdf/index.js")).pdfToWord(...args);
		},
		async rotatePdf(...args: Parameters<typeof import("./pdf/index.js").rotatePdf>) {
			return (await import("./pdf/index.js")).rotatePdf(...args);
		},
		async splitPdf(...args: Parameters<typeof import("./pdf/index.js").splitPdf>) {
			return (await import("./pdf/index.js")).splitPdf(...args);
		},
		async textToPdf(...args: Parameters<typeof import("./pdf/index.js").textToPdf>) {
			return (await import("./pdf/index.js")).textToPdf(...args);
		},
	},
	video: {
		async compressVideo(...args: Parameters<typeof import("./video/index.js").compressVideo>) {
			return (await import("./video/index.js")).compressVideo(...args);
		},
		async convertMovToMp4(...args: Parameters<typeof import("./video/index.js").convertMovToMp4>) {
			return (await import("./video/index.js")).convertMovToMp4(...args);
		},
		async downloadYouTubeVideo(
			...args: Parameters<typeof import("./video/index.js").downloadYouTubeVideo>
		) {
			return (await import("./video/index.js")).downloadYouTubeVideo(...args);
		},
		async removeVideoBackground(
			...args: Parameters<typeof import("./video/index.js").removeVideoBackground>
		) {
			return (await import("./video/index.js")).removeVideoBackground(...args);
		},
	},
};

export default DKUTILS;
