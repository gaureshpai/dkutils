const mongoose = require("mongoose");

const ToolUsageSchema = new mongoose.Schema(
  {
    toolName: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["image", "pdf", "text", "web"],
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Create a compound index for efficient queries
ToolUsageSchema.index({ category: 1, usageCount: -1 });

module.exports = mongoose.model("ToolUsage", ToolUsageSchema);
