import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { CompressionLevel } from "@package/interfaces/index.js";
import {
	applyPdfWatermark,
	ensureFileOutputPath,
	writeBuffer,
	writeText,
} from "@package/utils/index.js";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, degrees } from "pdf-lib";
import PDFDocumentKit from "pdfkit";
import * as XLSX from "xlsx";

const requireFromModule = createRequire(import.meta.url);

/**
 * Merges multiple PDF files into a single output file.
 */
export async function mergePdfs(
	inputFiles: string[],
	outputPath: string,
	watermark = true,
): Promise<string> {
	const finalPath = await ensureFileOutputPath(outputPath, "merged.pdf");
	const mergedPdf = await PDFDocument.create();

	for (const file of inputFiles) {
		const source = await PDFDocument.load(await readFile(path.resolve(file)));
		const pages = await mergedPdf.copyPages(source, source.getPageIndices());
		for (const page of pages) {
			mergedPdf.addPage(page);
		}
	}

	const bytes = await mergedPdf.save();
	const watermarked = await applyPdfWatermark(bytes, watermark);
	await writeBuffer(finalPath, Buffer.from(watermarked));
	return path.resolve(finalPath);
}

/**
 * Extracts a page range subset from a PDF.
 */
export async function splitPdf(
	inputFile: string,
	ranges: string,
	outputPath: string,
	watermark = true,
): Promise<string> {
	const finalPath = await ensureFileOutputPath(outputPath, "split.pdf");
	const source = await PDFDocument.load(await readFile(path.resolve(inputFile)));
	const pageIndices = parsePageRanges(ranges, source.getPageCount());
	const nextPdf = await PDFDocument.create();
	const pages = await nextPdf.copyPages(source, pageIndices);
	for (const page of pages) {
		nextPdf.addPage(page);
	}

	const bytes = await nextPdf.save();
	const watermarked = await applyPdfWatermark(bytes, watermark);
	await writeBuffer(finalPath, Buffer.from(watermarked));
	return path.resolve(finalPath);
}

/**
 * Deletes the provided page ranges from a PDF.
 */
export async function deletePdfPages(
	inputFile: string,
	ranges: string,
	outputPath: string,
	watermark = true,
): Promise<string> {
	const finalPath = await ensureFileOutputPath(outputPath, "deleted.pdf");
	const source = await PDFDocument.load(await readFile(path.resolve(inputFile)));
	const pagesToDelete = new Set(parsePageRanges(ranges, source.getPageCount()));

	for (let index = source.getPageCount() - 1; index >= 0; index -= 1) {
		if (pagesToDelete.has(index)) {
			source.removePage(index);
		}
	}

	const bytes = await source.save();
	const watermarked = await applyPdfWatermark(bytes, watermark);
	await writeBuffer(finalPath, Buffer.from(watermarked));
	return path.resolve(finalPath);
}

/**
 * Rotates every page in a PDF by the given angle.
 */
export async function rotatePdf(
	inputFile: string,
	angle: number,
	outputPath: string,
	watermark = true,
): Promise<string> {
	const finalPath = await ensureFileOutputPath(outputPath, "rotated.pdf");
	const source = await PDFDocument.load(await readFile(path.resolve(inputFile)));
	for (const page of source.getPages()) {
		page.setRotation(degrees(angle));
	}
	const bytes = await source.save();
	const watermarked = await applyPdfWatermark(bytes, watermark);
	await writeBuffer(finalPath, Buffer.from(watermarked));
	return path.resolve(finalPath);
}

/**
 * Saves a PDF using low, medium, or high compression settings.
 */
export async function compressPdf(
	inputFile: string,
	outputPath: string,
	level: CompressionLevel = "medium",
	watermark = true,
): Promise<string> {
	const finalPath = await ensureFileOutputPath(outputPath, "compressed.pdf");
	const source = await PDFDocument.load(await readFile(path.resolve(inputFile)));
	const saveOptions =
		level === "low"
			? {
					useObjectStreams: false,
					compress: false,
					updateFieldAppearances: false,
				}
			: level === "high"
				? {
						useObjectStreams: true,
						compress: true,
						updateFieldAppearances: false,
						objectsPerTick: 50,
					}
				: {
						useObjectStreams: true,
						compress: true,
						updateFieldAppearances: false,
					};
	const bytes = await source.save(saveOptions);
	const watermarked = await applyPdfWatermark(bytes, watermark);
	await writeBuffer(finalPath, Buffer.from(watermarked));
	return path.resolve(finalPath);
}

/**
 * Extracts text from a PDF or writes it to a file.
 *
 * @param outputPath - The file path to write the extracted text to
 * @returns The extracted text, or the resolved output path when `outputPath` is provided
 */
export async function pdfToText(inputFile: string, outputPath?: string): Promise<string> {
	const text = await extractPdfText(inputFile);
	if (outputPath) {
		await writeText(outputPath, text);
		return path.resolve(outputPath);
	}
	return text;
}

/**
 * Renders plain text into a PDF document.
 */
export async function textToPdf(
	content: string,
	outputPath: string,
	watermark = true,
): Promise<string> {
	const finalPath = await ensureFileOutputPath(outputPath, "dkutils-text-output.pdf");
	const doc = new PDFDocumentKit({ margin: 48 });
	const chunks: Buffer[] = [];
	doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
	const completion = new Promise<Buffer>((resolve, reject) => {
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
	});

	doc.fontSize(12).text(content);
	doc.end();

	const buffer = await completion;
	const watermarked = await applyPdfWatermark(buffer, watermark);
	await writeBuffer(finalPath, Buffer.from(watermarked));
	return path.resolve(finalPath);
}

/**
 * Converts extracted PDF text into a DOCX file.
 *
 * @param inputFile - Path to the source PDF
 * @param outputPath - Destination directory or file path
 * @returns The resolved path to the generated DOCX file
 */
export async function pdfToWord(inputFile: string, outputPath: string): Promise<string> {
	const finalPath = await ensureFileOutputPath(outputPath, "output.docx");
	const text = await extractPdfText(inputFile);
	const paragraphs = text
		.split(/\r?\n/)
		.map((line: string) => line.trim())
		.filter(Boolean)
		.map((line: string) => new Paragraph({ children: [new TextRun(line)] }));

	const doc = new Document({
		sections: [
			{
				properties: {},
				children: paragraphs.length > 0 ? paragraphs : [new Paragraph(" ")],
			},
		],
	});

	const buffer = await Packer.toBuffer(doc);
	await writeBuffer(finalPath, buffer);
	return path.resolve(finalPath);
}

/**
 * Converts PDF text into an XLSX spreadsheet.
 *
 * @param inputFile - The PDF file to convert
 * @param outputPath - The target output path
 * @returns The resolved path to the written `.xlsx` file
 */
export async function pdfToExcel(inputFile: string, outputPath: string): Promise<string> {
	const finalPath = await ensureFileOutputPath(outputPath, "output.xlsx");
	const text = await extractPdfText(inputFile);
	const rows = text
		.split(/\r?\n/)
		.map((line: string) => line.trim())
		.filter(Boolean)
		.map((line: string) => [line]);

	const workbook = XLSX.utils.book_new();
	const worksheet = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [[""]]);
	XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
	const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
	await writeBuffer(finalPath, Buffer.from(buffer));
	return path.resolve(finalPath);
}

/**
 * Extracts text from every page in a PDF.
 *
 * @param inputFile - Path to the source PDF file
 * @returns The extracted page text, separated by blank lines
 */
async function extractPdfText(inputFile: string): Promise<string> {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	const { pathToFileURL } = requireFromModule("node:url");
	const standardFontDataUrl = `${pathToFileURL(
		path.join(path.dirname(requireFromModule.resolve("pdfjs-dist/package.json")), "standard_fonts")
	).href}/`;
	const loadingTask = pdfjs.getDocument({
		data: new Uint8Array(await readFile(path.resolve(inputFile))),
		disableWorker: true,
		isEvalSupported: false,
		standardFontDataUrl,
	});
	const pdf = await loadingTask.promise;
	const pages: string[] = [];

	try {
		for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
			const page = await pdf.getPage(pageNumber);
			const textContent = await page.getTextContent();
			const pageText = textContent.items
				.map((item) => ("str" in item ? item.str : ""))
				.join(" ")
				.trim();

			if (pageText) {
				pages.push(pageText);
			}
		}

		return pages.join("\n\n").trim();
	} finally {
		await pdf.destroy();
	}
}

/**
 * Parses a page range string like `1-3,5` into zero-based page indices.
 */
export function parsePageRanges(ranges: string, totalPages: number): number[] {
	const pages = new Set<number>();
	for (const token of ranges
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean)) {
		if (token.includes("-")) {
			const [startString, endString] = token.split("-");
			const start = Number(startString);
			const end = Number(endString);
			if (
				!Number.isInteger(start) ||
				!Number.isInteger(end) ||
				start < 1 ||
				end > totalPages ||
				start > end
			) {
				throw new Error(`Invalid page range: ${token}`);
			}
			for (let page = start; page <= end; page += 1) {
				pages.add(page - 1);
			}
			continue;
		}

		const page = Number(token);
		if (!Number.isInteger(page) || page < 1 || page > totalPages) {
			throw new Error(`Invalid page number: ${token}`);
		}
		pages.add(page - 1);
	}

	return [...pages].sort((left, right) => left - right);
}
