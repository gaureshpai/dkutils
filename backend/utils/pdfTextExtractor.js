const path = require("node:path");

const extractTextFromPdf = async (pdfBuffer) => {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	const standardFontDataUrl = `${path
		.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts")
		.replaceAll(path.sep, "/")}/`;
	const loadingTask = pdfjs.getDocument({
		data: new Uint8Array(pdfBuffer),
		disableWorker: true,
		isEvalSupported: false,
		standardFontDataUrl,
	});
	const pdf = await loadingTask.promise;
	const pages = [];

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

		return {
			numpages: pdf.numPages,
			text: pages.join("\n\n"),
		};
	} finally {
		await pdf.destroy();
	}
};

module.exports = { extractTextFromPdf };
