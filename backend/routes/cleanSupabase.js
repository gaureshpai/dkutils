const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { cleanSupabaseStorage } = require("@backend/utils/supabaseCleaner");

const requireAuth = (req, res, next) => {
	const token = req.header("x-auth-token");

	if (!token) {
		return res.status(401).json({ msg: "No token, authorization denied" });
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded.user;
		if (req.user.role !== "admin") {
			return res.status(403).json({ msg: "Forbidden - admin only" });
		}
		return next();
	} catch (err) {
		return res.status(401).json({ msg: "Token is not valid" });
	}
};

const requireSecret = (req, res, next) => {
	const secret = req.header("x-cron-secret");
	const expectedSecret = process.env.SUPABASE_CLEANUP_CRON_SECRET;

	if (!secret || !expectedSecret || secret !== expectedSecret) {
		return res.status(401).json({ msg: "Invalid or missing cron secret" });
	}

	next();
};

const runCleanup = async (req, res) => {
	try {
		await cleanSupabaseStorage();
		res.status(200).json({ msg: "Supabase cleanup triggered successfully." });
	} catch (error) {
		console.error("Error triggering Supabase cleanup:", error);
		res.status(500).json({
			msg: "Failed to trigger Supabase cleanup.",
			error: error.message,
		});
	}
};

// @route   POST /api/clean-supabase
// @desc    Trigger Supabase storage cleanup
// @access  Private (requires auth token)
router.post("/", requireAuth, (req, res) => {
	runCleanup(req, res);
});

// @route   POST /api/clean-supabase/trigger
// @desc    Trigger Supabase storage cleanup via cron/external calls
// @access  Private (requires cron secret)
router.post("/trigger", requireSecret, (req, res) => {
	runCleanup(req, res);
});

module.exports = router;
