const mongoose = require("mongoose");

const ApiActivitySchema = new mongoose.Schema({
  endpoint: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  ipAddress: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("ApiActivity", ApiActivitySchema);
