const ApiActivity = require("../models/ApiActivity");
const { ServiceUsage, TotalUsage } = require("../models/ServiceUsage");

const apiActivityTracker = async (req, res, next) => {
  try {
    const apiActivity = new ApiActivity({
      endpoint: req.originalUrl,
      method: req.method,
      userId: req.user ? req.user.id : null,
      ipAddress: req.ip,
    });
    await apiActivity.save();

    await TotalUsage.findOneAndUpdate(
      {},
      { $inc: { totalCount: 1 } },
      { upsert: true, new: true },
    );

    await ServiceUsage.findOneAndUpdate(
      { endpoint: req.originalUrl },
      { $inc: { count: 1 } },
      { upsert: true, new: true },
    );
  } catch (err) {
    console.error("Error saving API activity:", err.message);
  }
  next();
};

module.exports = apiActivityTracker;
