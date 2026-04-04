const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const ToolUsage = require("@backend/models/ToolUsage");

// Rate limiting for /track endpoint
const trackLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 10, // limit each IP to 10 requests per windowMs
	message: { msg: "Too many tracking requests, please try again later." },
	standardHeaders: true,
	legacyHeaders: false,
	skipFailedRequests: false,
});

const isValidCategory = (category) => {
	if (!category) return false;
	const allowedCategories = ToolUsage.schema.path("category").enumValues;
	return allowedCategories.includes(category);
};

const MAX_SKIP = 10000;

const APPROVED_TOOL_CATEGORY_PAIRS = {
	"Base64TextConverter": "text",
	"CsvToJsonConverter": "web",
	"ExcelToPdfConverter": "pdf",
	"FaviconExtractor": "web",
	"HashGenerator": "web",
	"HtmlToMarkdownConverter": "web",
	"HtmlToMarkdownConverter:copy": "web",
	"ImageBackgroundRemover": "image",
	"ImageCompressor": "image",
	"ImageCropper": "image",
	"ImageFlipper": "image",
	"ImageFormatConverter": "image",
	"ImageGrayscaler": "image",
	"ImageResizer": "image",
	"ImageToBase64Converter": "image",
	"ImageToPdfConverter": "image",
	"JsonFormatterValidator": "web",
	"JsonToCsvConverter": "web",
	"JsonXmlConverter": "web",
	"Link Shortener": "web",
	"Login": "web",
	"MarkdownToHtmlConverter": "web",
	"PasswordGenerator": "web",
	"PasswordStrengthChecker": "web",
	"PdfCompressor": "pdf",
	"PdfMerger": "pdf",
	"PdfPageDeleter": "pdf",
	"PdfRotator": "pdf",
	"PdfSplitter": "pdf",
	"PdfToExcelConverter": "pdf",
	"PdfToTextConverter": "pdf",
	"PdfToWordConverter": "pdf",
	"PngToJpgConverter": "image",
	"QrCodeGenerator": "web",
	"QrCodeScanner": "web",
	"Register": "web",
	"SeoTools:robots_txt": "web",
	"SeoTools:robots_txt_error": "web",
	"SeoTools:robots_txt_not_found": "web",
	"SeoTools:robots_txt_success": "web",
	"SeoTools:sitemap_xml": "web",
	"SeoTools:sitemap_xml_error": "web",
	"SeoTools:sitemap_xml_not_found": "web",
	"SeoTools:sitemap_xml_success": "web",
	"TextCaseConverter": "text",
	"TextDifferenceChecker": "text",
	"TextToPdfGenerator": "pdf",
	"UrlRedirectChecker": "web",
	"WebsiteScreenshotGenerator": "web",
};

const isApprovedToolCategoryPair = (toolName, category) => {
	return APPROVED_TOOL_CATEGORY_PAIRS[toolName] === category;
};

// @route   POST /api/analytics/track
// @desc    Track tool usage
// @access  Public
router.post("/track", trackLimiter, async (req, res) => {
	try {
		// Support both new 'toolName' and legacy 'n' parameter for backwards compatibility
		let toolName = typeof req.body.toolName === "string" ? req.body.toolName : req.body.n;
		let { category } = req.body;

		if (typeof toolName !== "string" || typeof category !== "string") {
			return res.status(400).json({ msg: "Tool name and category must be strings." });
		}

		toolName = toolName.trim();
		category = category.trim();

		if (!toolName || !category) {
			return res.status(400).json({ msg: "Tool name and category are required." });
		}

		if (toolName.length > 100 || category.length > 50) {
			return res.status(400).json({ msg: "Tool name or category is too long." });
		}

		if (!isValidCategory(category)) {
			return res.status(400).json({ msg: "Invalid category" });
		}

		if (!isApprovedToolCategoryPair(toolName, category)) {
			return res.status(403).json({ msg: "Tool and category pair is not approved for tracking." });
		}

		const toolUsage = await ToolUsage.findOneAndUpdate(
			{ toolName, category },
			{
				$inc: { usageCount: 1 },
				$set: { lastUsed: new Date() },
				$setOnInsert: { toolName, category },
			},
			{ new: true, runValidators: true, upsert: true },
		);

		return res.json({ success: true, usageCount: toolUsage.usageCount });
	} catch (err) {
		console.error("Error tracking tool usage:", err);
		return res.status(500).json({ msg: "Server Error" });
	}
});

// @route   GET /api/analytics/stats
// @desc    Get tool usage statistics
// @access  Public
router.get("/stats", async (req, res) => {
	try {
		const { category, page = 1, limit = 50 } = req.query;

		// Validate and parse pagination parameters
		const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
		const limitNum = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 50)); // Max 100 per page

		// Enforce maximum offset to prevent huge MongoDB skips
		const maxPage = Math.floor(MAX_SKIP / limitNum) + 1;
		if (pageNum > maxPage) {
			return res.status(400).json({ msg: `Page number exceeds maximum allowed (${maxPage})` });
		}

		if (category && !isValidCategory(category)) {
			return res.status(400).json({ msg: "Invalid category" });
		}

		// Build query that restricts to approved tool/category pairs
		const approvedPairs = Object.entries(APPROVED_TOOL_CATEGORY_PAIRS)
			.filter(([toolName, cat]) => !category || cat === category)
			.map(([toolName, cat]) => ({ toolName, category: cat }));

		const query = approvedPairs.length > 0 ? { $or: approvedPairs } : { _id: null };

		// Get total count for pagination metadata
		const total = await ToolUsage.countDocuments(query);

		// Get paginated results
		const stats = await ToolUsage.find(query)
			.sort({ usageCount: -1 })
			.skip((pageNum - 1) * limitNum)
			.limit(limitNum)
			.select("toolName category usageCount lastUsed");

		return res.json({
			data: stats,
			pagination: {
				currentPage: pageNum,
				limit: limitNum,
				total,
				totalPages: Math.ceil(total / limitNum),
				hasNext: pageNum * limitNum < total,
				hasPrev: pageNum > 1,
			},
		});
	} catch (err) {
		console.error("Error fetching tool usage stats:", err);
		return res.status(500).json({ msg: "Server Error" });
	}
});

// @route   GET /api/analytics/popular
// @desc    Get most popular tools by category
// @access  Public
router.get("/popular", async (req, res) => {
	try {
		const categories = ToolUsage.schema.path("category").enumValues;
		const popularTools = {};

		// Run all queries in parallel
		const categoryPromises = categories.map(async (category) => {
			// Build query that restricts to approved tool/category pairs for this category
			const approvedPairs = Object.entries(APPROVED_TOOL_CATEGORY_PAIRS)
				.filter(([toolName, cat]) => cat === category)
				.map(([toolName, cat]) => ({ toolName, category: cat }));

			const query = approvedPairs.length > 0 ? { $or: approvedPairs } : { _id: null };

			const tools = await ToolUsage.find(query)
				.sort({ usageCount: -1 })
				.limit(10)
				.select("toolName usageCount");
			return { category, tools };
		});

		const results = await Promise.all(categoryPromises);

		// Populate the popularTools object
		for (const { category, tools } of results) {
			popularTools[category] = tools;
		}

		return res.json(popularTools);
	} catch (err) {
		console.error("Error fetching popular tools:", err);
		return res.status(500).json({ msg: "Server Error" });
	}
});

module.exports = router;