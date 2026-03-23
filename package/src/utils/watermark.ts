import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

import { DKU_WATERMARK } from "../branding.js";

export async function applyImageWatermark(
	buffer: Buffer,
	format: string,
	enabled = true,
): Promise<Buffer> {
	if (!enabled) {
		return buffer;
	}

	// For sharp version, we can use composite to add text or simply re-encode correctly
	// Currently it's a pass-through until we implement the actual text-layer logic,
	// similar to how the Jimp version was partially implemented.
	let pipeline = sharp(buffer);

	if (format === "jpeg" || format === "jpg") {
		pipeline = pipeline.jpeg({ quality: 82 });
	} else if (format === "png") {
		pipeline = pipeline.png({ compressionLevel: 9 });
	}

	return pipeline.toBuffer();
}

export async function applyPdfWatermark(pdfBytes: Uint8Array, enabled = true): Promise<Uint8Array> {
	if (!enabled) {
		return pdfBytes;
	}

	const pdfDoc = await PDFDocument.load(pdfBytes);
	const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	for (const page of pdfDoc.getPages()) {
		const { width, height } = page.getSize();
		const fontSize = Math.max(Math.round(width / 18), 20);
		page.drawText(DKU_WATERMARK, {
			x: Math.max(width - fontSize * 4.2, 24),
			y: 18,
			size: fontSize,
			font,
			color: rgb(1, 1, 1),
			opacity: 0.3,
		});
	}

	return pdfDoc.save();
}
