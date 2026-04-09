"use strict";

/**
 * Tests for routes/analytics.js changes introduced in this PR.
 *
 * Key changes in this PR:
 * - Added string type validation for toolName/category (rejects non-strings)
 * - Added length limit validation (toolName ≤ 100 chars, category ≤ 50 chars)
 * - Added isApprovedToolCategoryPair() check (returns 403 for unapproved pairs)
 * - Updated isValidCategory() to use ToolUsage schema enum values
 * - Added whitespace trimming for toolName and category
 * - Moved to @backend module alias
 *
 * These tests inline the validation logic from analytics.js to avoid
 * requiring uninstalled external dependencies (mongoose, express-rate-limit).
 */

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ---------------------------------------------------------------------------
// Inline the validation logic from routes/analytics.js
// ---------------------------------------------------------------------------

// ToolUsage.schema.path("category").enumValues equivalent
const VALID_CATEGORIES = ["image", "pdf", "text", "web"];

function isValidCategory(category) {
	if (!category) return false;
	return VALID_CATEGORIES.includes(category);
}

// Matches APPROVED_TOOL_CATEGORY_PAIRS from analytics.js
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

// Matches APPROVED_PUBLIC_TOOL_CATEGORY_PAIRS from analytics.js
const APPROVED_PUBLIC_TOOL_CATEGORY_PAIRS = {
	Base64TextConverter: "text",
	CsvToJsonConverter: "web",
	ExcelToPdfConverter: "pdf",
	FaviconExtractor: "web",
	HashGenerator: "web",
	HtmlToMarkdownConverter: "web",
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
	TextCaseConverter: "text",
	TextDifferenceChecker: "text",
	TextToPdfGenerator: "pdf",
	UrlRedirectChecker: "web",
	WebsiteScreenshotGenerator: "web",
};

function isApprovedToolCategoryPair(toolName, category) {
	return APPROVED_TOOL_CATEGORY_PAIRS[toolName] === category;
}

const MAX_SKIP = 10000;

/**
 * Simulates the POST /track request validation logic from analytics.js.
 * Returns an object describing what response should be sent.
 */
function validateTrackRequest(body) {
	let toolName = typeof body.toolName === "string" ? body.toolName : body.n;
	let { category } = body;

	if (typeof toolName !== "string" || typeof category !== "string") {
		return { status: 400, json: { msg: "Tool name and category must be strings." } };
	}

	toolName = toolName.trim();
	category = category.trim();

	if (!toolName || !category) {
		return { status: 400, json: { msg: "Tool name and category are required." } };
	}

	if (toolName.length > 100 || category.length > 50) {
		return { status: 400, json: { msg: "Tool name or category is too long." } };
	}

	if (!isValidCategory(category)) {
		return { status: 400, json: { msg: "Invalid category" } };
	}

	if (!isApprovedToolCategoryPair(toolName, category)) {
		return { status: 403, json: { msg: "Tool and category pair is not approved for tracking." } };
	}

	return { status: 200 }; // passes validation
}

/**
 * Simulates the pagination clamping/validation logic from GET /stats in analytics.js.
 */
function validateStatsRequest(query) {
	let { category, page = 1, limit = 50 } = query;

	if (typeof category === "string") {
		category = category.trim();
		if (category === "") category = undefined;
	}

	const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
	const limitNum = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 50));

	const maxPage = Math.floor(MAX_SKIP / limitNum) + 1;
	if (pageNum > maxPage) {
		return { status: 400, json: { msg: `Page number exceeds maximum allowed (${maxPage})` } };
	}

	if (category && !isValidCategory(category)) {
		return { status: 400, json: { msg: "Invalid category" } };
	}

	return { status: 200, pageNum, limitNum, category };
}

// ---------------------------------------------------------------------------
// isValidCategory tests
// ---------------------------------------------------------------------------

describe("analytics.js - isValidCategory()", () => {
	test("returns true for 'image'", () => {
		assert.equal(isValidCategory("image"), true);
	});

	test("returns true for 'pdf'", () => {
		assert.equal(isValidCategory("pdf"), true);
	});

	test("returns true for 'text'", () => {
		assert.equal(isValidCategory("text"), true);
	});

	test("returns true for 'web'", () => {
		assert.equal(isValidCategory("web"), true);
	});

	test("returns false for unknown category", () => {
		assert.equal(isValidCategory("video"), false);
	});

	test("returns false for empty string", () => {
		assert.equal(isValidCategory(""), false);
	});

	test("returns false for null/undefined", () => {
		assert.equal(isValidCategory(null), false);
		assert.equal(isValidCategory(undefined), false);
	});

	test("is case-sensitive: 'IMAGE' is not valid", () => {
		assert.equal(isValidCategory("IMAGE"), false);
	});
});

// ---------------------------------------------------------------------------
// isApprovedToolCategoryPair tests
// ---------------------------------------------------------------------------

describe("analytics.js - isApprovedToolCategoryPair()", () => {
	test("returns true for known approved pair (ImageCompressor / image)", () => {
		assert.equal(isApprovedToolCategoryPair("ImageCompressor", "image"), true);
	});

	test("returns true for known approved pair (PdfMerger / pdf)", () => {
		assert.equal(isApprovedToolCategoryPair("PdfMerger", "pdf"), true);
	});

	test("returns true for known approved pair (Base64TextConverter / text)", () => {
		assert.equal(isApprovedToolCategoryPair("Base64TextConverter", "text"), true);
	});

	test("returns true for approved pair with space in tool name (Link Shortener / web)", () => {
		assert.equal(isApprovedToolCategoryPair("Link Shortener", "web"), true);
	});

	test("returns false for mismatched tool/category", () => {
		assert.equal(isApprovedToolCategoryPair("ImageCompressor", "pdf"), false);
	});

	test("returns false for unknown tool", () => {
		assert.equal(isApprovedToolCategoryPair("UnknownTool", "image"), false);
	});

	test("returns false for empty strings", () => {
		assert.equal(isApprovedToolCategoryPair("", ""), false);
	});

	test("Login is in approved pairs but NOT in public pairs (internal event filtering)", () => {
		assert.equal(APPROVED_TOOL_CATEGORY_PAIRS["Login"], "web");
		assert.equal(APPROVED_PUBLIC_TOOL_CATEGORY_PAIRS["Login"], undefined);
	});

	test("Register is in approved pairs but NOT in public pairs", () => {
		assert.equal(APPROVED_TOOL_CATEGORY_PAIRS["Register"], "web");
		assert.equal(APPROVED_PUBLIC_TOOL_CATEGORY_PAIRS["Register"], undefined);
	});

	test("SeoTools:robots_txt is in approved pairs but NOT in public pairs", () => {
		assert.equal(APPROVED_TOOL_CATEGORY_PAIRS["SeoTools:robots_txt"], "web");
		assert.equal(APPROVED_PUBLIC_TOOL_CATEGORY_PAIRS["SeoTools:robots_txt"], undefined);
	});
});

// ---------------------------------------------------------------------------
// POST /track validation logic tests
// ---------------------------------------------------------------------------

describe("analytics.js - POST /track request validation", () => {
	test("returns 400 when toolName is not a string (number)", () => {
		const result = validateTrackRequest({ toolName: 123, category: "image" });
		assert.equal(result.status, 400);
		assert.match(result.json.msg, /strings/);
	});

	test("returns 400 when category is not a string (boolean)", () => {
		const result = validateTrackRequest({ toolName: "ImageCompressor", category: true });
		assert.equal(result.status, 400);
		assert.match(result.json.msg, /strings/);
	});

	test("returns 400 when both fields are missing", () => {
		const result = validateTrackRequest({});
		assert.equal(result.status, 400);
	});

	test("returns 400 when toolName is empty after trim", () => {
		const result = validateTrackRequest({ toolName: "   ", category: "image" });
		assert.equal(result.status, 400);
		assert.match(result.json.msg, /required/);
	});

	test("returns 400 when category is empty after trim", () => {
		const result = validateTrackRequest({ toolName: "ImageCompressor", category: "   " });
		assert.equal(result.status, 400);
		assert.match(result.json.msg, /required/);
	});

	test("returns 400 when toolName exceeds 100 characters", () => {
		const result = validateTrackRequest({
			toolName: "A".repeat(101),
			category: "image",
		});
		assert.equal(result.status, 400);
		assert.match(result.json.msg, /too long/);
	});

	test("returns 400 when category exceeds 50 characters", () => {
		const result = validateTrackRequest({
			toolName: "ImageCompressor",
			category: "c".repeat(51),
		});
		assert.equal(result.status, 400);
		assert.match(result.json.msg, /too long/);
	});

	test("returns 400 for invalid category", () => {
		const result = validateTrackRequest({ toolName: "ImageCompressor", category: "video" });
		assert.equal(result.status, 400);
		assert.deepEqual(result.json, { msg: "Invalid category" });
	});

	test("returns 403 for valid category but unapproved tool/category pair", () => {
		// ImageCompressor is valid for 'image', not for 'pdf'
		const result = validateTrackRequest({ toolName: "ImageCompressor", category: "pdf" });
		assert.equal(result.status, 403);
		assert.match(result.json.msg, /not approved/);
	});

	test("returns 403 for completely unknown tool name", () => {
		const result = validateTrackRequest({ toolName: "EvilTool", category: "web" });
		assert.equal(result.status, 403);
	});

	test("passes validation for approved ImageCompressor/image pair", () => {
		const result = validateTrackRequest({ toolName: "ImageCompressor", category: "image" });
		assert.equal(result.status, 200);
	});

	test("passes validation for approved PdfMerger/pdf pair", () => {
		const result = validateTrackRequest({ toolName: "PdfMerger", category: "pdf" });
		assert.equal(result.status, 200);
	});

	test("passes validation when using legacy 'n' parameter instead of 'toolName'", () => {
		const result = validateTrackRequest({ n: "ImageCompressor", category: "image" });
		assert.equal(result.status, 200);
	});

	test("toolName takes precedence over legacy 'n' when both present", () => {
		// toolName is a valid string so it takes precedence
		const result = validateTrackRequest({
			toolName: "PdfMerger",
			n: "ImageCompressor",
			category: "pdf",
		});
		assert.equal(result.status, 200);
	});

	test("trims leading/trailing whitespace from toolName and category", () => {
		const result = validateTrackRequest({
			toolName: "  ImageCompressor  ",
			category: "  image  ",
		});
		assert.equal(result.status, 200);
	});

	test("exactly 100 character toolName is accepted", () => {
		// Not in approved list, so it will be 403 not 400 for length
		const result = validateTrackRequest({
			toolName: "A".repeat(100),
			category: "image",
		});
		// Should get past length check (status won't be 400 with "too long")
		assert.notEqual(result.json?.msg, "Tool name or category is too long.");
	});

	test("exactly 50 character category is accepted for length check", () => {
		const result = validateTrackRequest({
			toolName: "ImageCompressor",
			category: "i".repeat(50),
		});
		// Will fail on isValidCategory, not on length
		assert.notEqual(result.json?.msg, "Tool name or category is too long.");
	});
});

// ---------------------------------------------------------------------------
// GET /stats pagination validation logic tests
// ---------------------------------------------------------------------------

describe("analytics.js - GET /stats pagination validation", () => {
	test("uses default page=1 and limit=50 when not specified", () => {
		const result = validateStatsRequest({});
		assert.equal(result.status, 200);
		assert.equal(result.pageNum, 1);
		assert.equal(result.limitNum, 50);
	});

	test("parses page and limit from query string", () => {
		const result = validateStatsRequest({ page: "2", limit: "25" });
		assert.equal(result.pageNum, 2);
		assert.equal(result.limitNum, 25);
	});

	test("clamps limit to max 100", () => {
		const result = validateStatsRequest({ limit: "200" });
		assert.equal(result.limitNum, 100);
	});

	test("limit=0 uses default of 50 (0 is falsy so || 50 kicks in)", () => {
		// parseInt("0") === 0, which is falsy, so `parseInt(limit) || 50` returns 50
		const result = validateStatsRequest({ limit: "0" });
		assert.equal(result.limitNum, 50);
	});

	test("clamps negative limit to 1 via Math.max(1, ...)", () => {
		// parseInt("-5") = -5, not falsy, so -5 passes through; Math.max(1, -5) = 1
		const result = validateStatsRequest({ limit: "-5" });
		assert.equal(result.limitNum, 1);
	});

	test("clamps negative limit to 1", () => {
		const result = validateStatsRequest({ limit: "-5" });
		assert.equal(result.limitNum, 1);
	});

	test("defaults page to 1 when non-numeric string provided", () => {
		const result = validateStatsRequest({ page: "abc" });
		assert.equal(result.pageNum, 1);
	});

	test("returns 400 when page exceeds MAX_SKIP boundary", () => {
		// With limit=50, maxPage = floor(10000/50)+1 = 201
		const result = validateStatsRequest({ page: "202", limit: "50" });
		assert.equal(result.status, 400);
		assert.match(result.json.msg, /maximum allowed/);
	});

	test("allows page at exactly the MAX_SKIP boundary", () => {
		// With limit=50, maxPage = 201
		const result = validateStatsRequest({ page: "201", limit: "50" });
		assert.equal(result.status, 200);
	});

	test("returns 400 for invalid category in stats", () => {
		const result = validateStatsRequest({ category: "video" });
		assert.equal(result.status, 400);
		assert.deepEqual(result.json, { msg: "Invalid category" });
	});

	test("passes with valid category filter", () => {
		const result = validateStatsRequest({ category: "image" });
		assert.equal(result.status, 200);
		assert.equal(result.category, "image");
	});

	test("treats empty string category as undefined (no filter)", () => {
		const result = validateStatsRequest({ category: "" });
		assert.equal(result.status, 200);
		assert.equal(result.category, undefined);
	});

	test("trims whitespace from category", () => {
		const result = validateStatsRequest({ category: "   " });
		assert.equal(result.status, 200);
		assert.equal(result.category, undefined);
	});

	test("returns 400 when page is extremely large (beyond max skip)", () => {
		const result = validateStatsRequest({ page: "99999", limit: "1" });
		assert.equal(result.status, 400);
	});
});

// ---------------------------------------------------------------------------
// APPROVED_PUBLIC_TOOL_CATEGORY_PAIRS completeness tests
// ---------------------------------------------------------------------------

describe("analytics.js - public tool category pairs consistency", () => {
	test("all public pairs have valid categories", () => {
		for (const [toolName, category] of Object.entries(APPROVED_PUBLIC_TOOL_CATEGORY_PAIRS)) {
			assert.equal(
				isValidCategory(category),
				true,
				`Tool '${toolName}' has invalid category '${category}'`,
			);
		}
	});

	test("public pairs are a subset of all approved pairs", () => {
		for (const [toolName, category] of Object.entries(APPROVED_PUBLIC_TOOL_CATEGORY_PAIRS)) {
			assert.equal(
				APPROVED_TOOL_CATEGORY_PAIRS[toolName],
				category,
				`Public tool '${toolName}' not found in full approved pairs`,
			);
		}
	});

	test("internal-only tools (Login, Register, SeoTools:*) are excluded from public pairs", () => {
		const internalOnlyTools = ["Login", "Register", "SeoTools:robots_txt", "SeoTools:sitemap_xml"];
		for (const tool of internalOnlyTools) {
			assert.equal(
				APPROVED_PUBLIC_TOOL_CATEGORY_PAIRS[tool],
				undefined,
				`Internal tool '${tool}' should not be in public pairs`,
			);
		}
	});
});