const mongoose = require("mongoose");

const ServiceUsageSchema = new mongoose.Schema({
  endpoint: {
    type: String,
    required: true,
    unique: true,
  },
  count: {
    type: Number,
    default: 0,
  },
});

const TotalUsageSchema = new mongoose.Schema({
  totalCount: {
    type: Number,
    default: 0,
  },
});

const ServiceUsage = mongoose.model("ServiceUsage", ServiceUsageSchema);
const TotalUsage = mongoose.model("TotalUsage", TotalUsageSchema);

module.exports = { ServiceUsage, TotalUsage };
