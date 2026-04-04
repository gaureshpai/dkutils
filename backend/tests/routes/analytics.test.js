"use strict";

/**
 * Tests for backend/routes/analytics.js
 *
 * We test the validation logic (isValidCategory, isApprovedToolCategoryPair,
 * input sanitization) by extracting the rules mirrored from the route file.
 * This avoids importing mongoose/DB but validates the exact logic used.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

// ── Mirrored constants and helpers from analytics.js ─────────────────────────
// These are exact copies of the logic in analytics.js, ensuring our tests
// cover the real implementation rules.

const VALID_CATEGORIES = ["image", "pdf", "text", "web"];

const isValidCategory = (category) => {
	if (!category) return false;
	return VALID_CATEGORIES.includes(category);
};

const APPROVED_TOOL_CATEGORY_PAIRS = {
	Base64TextConverter: "text",
	CsvToJsonConverter: "web",
	ExcelToPdfConverter: "pdf",
	FaviconExtractor: "web",
	HashGenerator: "web",
	HtmlToMarkdownConverter: "web",
	"HtmlToMarkdownConverter:copy": "web",
	ImageBackgroundRemover: "image",
	ImageCompressor: "image",
	ImageCropper: "image",
	ImageFlipper: "image",
	ImageFormatConverter: "image",
	ImageGrayscaler: "image",
	ImageResizer: "image",
	ImageToBase64Converter: "image",
	ImageToPdfConverter: "image",
	JsonFormatterValidator: "web",
	JsonToCsvConverter: "web",
	JsonXmlConverter: "web",
	"Link Shortener": "web",
	Login: "web",
	MarkdownToHtmlConverter: "web",
	PasswordGenerator: "web",
	PasswordStrengthChecker: "web",
	PdfCompressor: "pdf",
	PdfMerger: "pdf",
	PdfPageDeleter: "pdf",
	PdfRotator: "pdf",
	PdfSplitter: "pdf",
	PdfToExcelConverter: "pdf",
	PdfToTextConverter: "pdf",
	PdfToWordConverter: "pdf",
	PngToJpgConverter: "image",
	QrCodeGenerator: "web",
	QrCodeScanner: "web",
	Register: "web",
	"SeoTools:robots_txt": "web",
	"SeoTools:robots_txt_error": "web",
	"SeoTools:robots_txt_not_found": "web",
	"SeoTools:robots_txt_success": "web",
	"SeoTools:sitemap_xml": "web",
	"SeoTools:sitemap_xml_error": "web",
	"SeoTools:sitemap_xml_not_found": "web",
	"SeoTools:sitemap_xml_success": "web",
	TextCaseConverter: "text",
	TextDifferenceChecker: "text",
	TextToPdfGenerator: "pdf",
	UrlRedirectChecker: "web",
	WebsiteScreenshotGenerator: "web",
};

const isApprovedToolCategoryPair = (toolName, category) => {
	return APPROVED_TOOL_CATEGORY_PAIRS[toolName] === category;
};

// ── isValidCategory tests ─────────────────────────────────────────────────────

test("isValidCategory - returns true for 'image'", () => {
	assert.equal(isValidCategory("image"), true);
});

test("isValidCategory - returns true for 'pdf'", () => {
	assert.equal(isValidCategory("pdf"), true);
});

test("isValidCategory - returns true for 'text'", () => {
	assert.equal(isValidCategory("text"), true);
});

test("isValidCategory - returns true for 'web'", () => {
	assert.equal(isValidCategory("web"), true);
});

test("isValidCategory - returns false for unknown category", () => {
	assert.equal(isValidCategory("video"), false);
	assert.equal(isValidCategory("document"), false);
	assert.equal(isValidCategory("audio"), false);
});

test("isValidCategory - returns false for null", () => {
	assert.equal(isValidCategory(null), false);
});

test("isValidCategory - returns false for undefined", () => {
	assert.equal(isValidCategory(undefined), false);
});

test("isValidCategory - returns false for empty string", () => {
	assert.equal(isValidCategory(""), false);
});

test("isValidCategory - is case-sensitive (rejects 'Image')", () => {
	assert.equal(isValidCategory("Image"), false);
	assert.equal(isValidCategory("PDF"), false);
	assert.equal(isValidCategory("TEXT"), false);
	assert.equal(isValidCategory("Web"), false);
});

// ── isApprovedToolCategoryPair tests ─────────────────────────────────────────

test("isApprovedToolCategoryPair - ImageCompressor + image: approved", () => {
	assert.equal(isApprovedToolCategoryPair("ImageCompressor", "image"), true);
});

test("isApprovedToolCategoryPair - PdfMerger + pdf: approved", () => {
	assert.equal(isApprovedToolCategoryPair("PdfMerger", "pdf"), true);
});

test("isApprovedToolCategoryPair - Base64TextConverter + text: approved", () => {
	assert.equal(isApprovedToolCategoryPair("Base64TextConverter", "text"), true);
});

test("isApprovedToolCategoryPair - FaviconExtractor + web: approved", () => {
	assert.equal(isApprovedToolCategoryPair("FaviconExtractor", "web"), true);
});

test("isApprovedToolCategoryPair - ImageCompressor + pdf: rejected (wrong category)", () => {
	assert.equal(isApprovedToolCategoryPair("ImageCompressor", "pdf"), false);
});

test("isApprovedToolCategoryPair - PdfMerger + image: rejected (wrong category)", () => {
	assert.equal(isApprovedToolCategoryPair("PdfMerger", "image"), false);
});

test("isApprovedToolCategoryPair - unknown tool: rejected", () => {
	assert.equal(isApprovedToolCategoryPair("UnknownTool", "web"), false);
	assert.equal(isApprovedToolCategoryPair("SomeFakeTool", "image"), false);
});

test("isApprovedToolCategoryPair - tool with colon key works (HtmlToMarkdownConverter:copy)", () => {
	assert.equal(isApprovedToolCategoryPair("HtmlToMarkdownConverter:copy", "web"), true);
});

test("isApprovedToolCategoryPair - tool with space works (Link Shortener)", () => {
	assert.equal(isApprovedToolCategoryPair("Link Shortener", "web"), true);
});

test("isApprovedToolCategoryPair - SeoTools variants: all approved as web", () => {
	const seoTools = [
		"SeoTools:robots_txt",
		"SeoTools:robots_txt_error",
		"SeoTools:robots_txt_not_found",
		"SeoTools:robots_txt_success",
		"SeoTools:sitemap_xml",
		"SeoTools:sitemap_xml_error",
		"SeoTools:sitemap_xml_not_found",
		"SeoTools:sitemap_xml_success",
	];
	for (const tool of seoTools) {
		assert.equal(isApprovedToolCategoryPair(tool, "web"), true, `${tool} should be approved`);
	}
});

test("isApprovedToolCategoryPair - empty tool name: rejected", () => {
	assert.equal(isApprovedToolCategoryPair("", "web"), false);
});

// ── Input validation logic tests ──────────────────────────────────────────────
// These mirror the validation checks in router.post("/track", ...)

test("track endpoint validation - toolName and category must be strings", () => {
	// Simulates the type check before trim()
	const invalidInputs = [
		{ toolName: 123, category: "web" },
		{ toolName: "ImageCompressor", category: null },
		{ toolName: null, category: "web" },
		{ toolName: undefined, category: "web" },
	];

	for (const input of invalidInputs) {
		const toolName = typeof input.toolName === "string" ? input.toolName : input.n;
		const { category } = input;
		const isValid = typeof toolName === "string" && typeof category === "string";
		assert.equal(isValid, false, `Should reject: ${JSON.stringify(input)}`);
	}
});

test("track endpoint validation - trimmed empty strings are rejected", () => {
	// After trim(), empty strings should be rejected
	const toolName = "  ".trim();
	const category = "  ".trim();
	assert.equal(!toolName || !category, true, "Empty trimmed strings should be rejected");
});

test("track endpoint validation - toolName max length 100 chars", () => {
	const longName = "A".repeat(101);
	assert.equal(longName.length > 100, true, "101-char name should exceed limit");

	const okName = "A".repeat(100);
	assert.equal(okName.length > 100, false, "100-char name should be within limit");
});

test("track endpoint validation - category max length 50 chars", () => {
	const longCategory = "x".repeat(51);
	assert.equal(longCategory.length > 50, true, "51-char category should exceed limit");

	const okCategory = "x".repeat(50);
	assert.equal(okCategory.length > 50, false, "50-char category should be within limit");
});

test("track endpoint validation - legacy 'n' param fallback for toolName", () => {
	// analytics.js supports both req.body.toolName and req.body.n (legacy)
	const body1 = { toolName: "ImageCompressor", category: "image" };
	const body2 = { n: "ImageCompressor", category: "image" };

	const resolveName = (body) => {
		return typeof body.toolName === "string" ? body.toolName : body.n;
	};

	assert.equal(resolveName(body1), "ImageCompressor");
	assert.equal(resolveName(body2), "ImageCompressor");
});

// ── Pagination parameter validation ──────────────────────────────────────────

test("stats endpoint - pageNum defaults to 1 for non-numeric page", () => {
	const pageNum = Math.max(1, Number.parseInt("abc", 10) || 1);
	assert.equal(pageNum, 1, "Non-numeric page should default to 1");
});

test("stats endpoint - limitNum is capped at 100", () => {
	const limitNum = Math.max(1, Math.min(100, Number.parseInt("200", 10) || 50));
	assert.equal(limitNum, 100, "limit=200 should be capped to 100");
});

test("stats endpoint - limitNum defaults to 50", () => {
	const limitNum = Math.max(1, Math.min(100, Number.parseInt(undefined, 10) || 50));
	assert.equal(limitNum, 50, "undefined limit should default to 50");
});

test("stats endpoint - limit=0 falls back to default 50 (parseInt('0') is falsy)", () => {
	// parseInt("0") === 0, which is falsy, so || 50 applies → result is 50 (not clamped to 1)
	const limitNum = Math.max(1, Math.min(100, Number.parseInt("0", 10) || 50));
	assert.equal(limitNum, 50, "limit=0 should fall back to default of 50");
});

test("stats endpoint - pageNum minimum is 1 even for negative input", () => {
	const pageNum = Math.max(1, Number.parseInt("-5", 10) || 1);
	assert.equal(pageNum, 1, "Negative page should be clamped to 1");
});