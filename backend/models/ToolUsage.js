const mongoose = require("mongoose");

const ToolUsageSchema = new mongoose.Schema(
  {
    toolName: {
      type: String,
      required: true,
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

// Create indexes for efficient queries and uniqueness
ToolUsageSchema.index({ category: 1, usageCount: -1 });
ToolUsageSchema.index({ toolName: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("ToolUsage", ToolUsageSchema);
