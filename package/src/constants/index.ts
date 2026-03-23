export const DKU_BRAND = "dkutils";
export const DKU_WATERMARK = "dkutils";

export const capabilityGroups = {
	image: [
		"remove-bg",
		"convert",
		"compress",
		"to-png",
		"resize",
		"crop",
		"grayscale",
		"flip",
		"to-pdf",
		"to-base64",
		"from-base64",
		"png-to-jpg",
	],
	pdf: [
		"compress",
		"split",
		"delete-pages",
		"text-to-pdf",
		"merge",
		"rotate",
		"to-text",
		"to-word",
		"to-excel",
	],
	video: ["remove-bg", "mov-to-mp4", "compress"],
	youtube: ["download"],
} as const;

export const IMAGE_EXTENSIONS = [
	".jpg",
	".jpeg",
	".png",
	".webp",
	".tif",
	".tiff",
	".gif",
	".avif",
	".bmp",
];
