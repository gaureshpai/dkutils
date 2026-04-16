const ApiActivity = require("@backend/models/ApiActivity");
const { ServiceUsage, TotalUsage } = require("@backend/models/ServiceUsage");

/**
 * Middleware to track API activity.
 *
 * Saves an ApiActivity document for each request.
 * Increments the totalCount field of a TotalUsage document for the global key.
 * Increments the count field of a ServiceUsage document for the current endpoint.
 *
 * @function
 * @param {express.Request} req - The express request object.
 * @param {express.Response} res - The express response object.
 * @param {express.NextFunction} next - The next middleware function.
 */
const apiActivityTracker = async (req, res, next) => {
	try {
		const apiActivity = new ApiActivity({
			endpoint: req.path,
			method: req.method,
			userId: req.user ? req.user.id : null,
			ipAddress: req.ip,
		});
		await apiActivity.save();

		await Promise.all([
			TotalUsage.findOneAndUpdate(
				{ key: "global" },
				{ $inc: { totalCount: 1 }, $setOnInsert: { key: "global" } },
				{ upsert: true, new: true },
			),
			ServiceUsage.findOneAndUpdate(
				{ endpoint: req.path },
				{ $inc: { count: 1 } },
				{ upsert: true, new: true },
			),
		]);
	} catch (err) {
		console.error("Error saving API activity:", err.message);
	}
	next();
};

module.exports = apiActivityTracker;
