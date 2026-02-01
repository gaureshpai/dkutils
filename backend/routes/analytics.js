const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const ToolUsage = require("../models/ToolUsage");

// Rate limiting for /track endpoint
const trackLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: { msg: "Too many tracking requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
});

const isValidCategory = (category) => {
  if (!category) return false;
  const allowedCategories = ToolUsage.schema.path("category").enumValues;
  return allowedCategories.includes(category);
};

// @route   POST /api/analytics/track
// @desc    Track tool usage
// @access  Public
router.post("/track", trackLimiter, async (req, res) => {
  try {
    const { toolName, category } = req.body;

    if (!toolName || !category) {
      return res
        .status(400)
        .json({ msg: "Tool name and category are required." });
    }

    if (!isValidCategory(category)) {
      return res.status(400).json({ msg: "Invalid category" });
    }

    // Find and update or create new entry
    const toolUsage = await ToolUsage.findOneAndUpdate(
      { toolName, category },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsed: new Date() },
      },
      { upsert: true, new: true, runValidators: true },
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
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50)); // Max 100 per page

    if (category && !isValidCategory(category)) {
      return res.status(400).json({ msg: "Invalid category" });
    }

    const query = category ? { category } : {};

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
      const tools = await ToolUsage.find({ category })
        .sort({ usageCount: -1 })
        .limit(10)
        .select("toolName usageCount");
      return { category, tools };
    });

    const results = await Promise.all(categoryPromises);

    // Populate the popularTools object
    results.forEach(({ category, tools }) => {
      popularTools[category] = tools;
    });

    return res.json(popularTools);
  } catch (err) {
    console.error("Error fetching popular tools:", err);
    return res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
