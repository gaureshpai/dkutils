const ApiActivity = require("@backend/models/ApiActivity");
const { ServiceUsage, TotalUsage } = require("@backend/models/ServiceUsage");

const apiActivityTracker = async (req, res, next) => {
	try {
		const apiActivity = new ApiActivity({
			endpoint: req.path,
			method: req.method,
			userId: req.user ? req.user.id : null,
			ipAddress: req.ip,
		});
		await apiActivity.save();

		await TotalUsage.findOneAndUpdate(
			{ key: "global" },
			{ $inc: { totalCount: 1 }, $setOnInsert: { key: "global" } },
			{ upsert: true, new: true },
		);

		await ServiceUsage.findOneAndUpdate(
			{ endpoint: req.path },
			{ $inc: { count: 1 } },
			{ upsert: true, new: true },
		);
	} catch (err) {
		console.error("Error saving API activity:", err.message);
	}
	next();
};

module.exports = apiActivityTracker;
