const router = require("express").Router();
const ToolUsage = require("../models/ToolUsage");

const isValidCategory = (category) => {
  if (!category) return false;
  const allowedCategories = ToolUsage.schema.path("category").enumValues;
  return allowedCategories.includes(category);
};

// @route   POST /api/analytics/track
// @desc    Track tool usage
// @access  Public
router.post("/track", async (req, res) => {
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
    const { category } = req.query;

    if (category && !isValidCategory(category)) {
      return res.status(400).json({ msg: "Invalid category" });
    }

    const query = category ? { category } : {};
    const stats = await ToolUsage.find(query)
      .sort({ usageCount: -1 })
      .select("toolName category usageCount lastUsed");

    return res.json(stats);
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
    const categories = ["image", "pdf", "text", "web"];
    const popularTools = {};

    for (const category of categories) {
      const tools = await ToolUsage.find({ category })
        .sort({ usageCount: -1 })
        .limit(10)
        .select("toolName usageCount");
      popularTools[category] = tools;
    }

    return res.json(popularTools);
  } catch (err) {
    console.error("Error fetching popular tools:", err);
    return res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
