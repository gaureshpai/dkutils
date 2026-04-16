const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { cleanSupabaseStorage } = require("@backend/utils/supabaseCleaner");

/**
 * Middleware to require authentication and authorization.
 * Verifies the presence of a valid token in the Authorization header,
 * and checks if the user has the admin role.
 * If the token is invalid or missing, returns a 401 error.
 * If the user is not an admin, returns a 403 error.
 */
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

/**
 * Middleware to verify the presence of a valid cron secret in the Authorization header.
 * Returns a 401 error if the secret is invalid or missing.
 */
const requireSecret = (req, res, next) => {
	const secret = req.header("x-cron-secret");
	const expectedSecret = process.env.SUPABASE_CLEANUP_CRON_SECRET;

	if (!secret || !expectedSecret || secret !== expectedSecret) {
		return res.status(401).json({ msg: "Invalid or missing cron secret" });
	}

	next();
};

/**
 * Trigger Supabase storage cleanup.
 * @function
 * @name runCleanup
 * @async
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} - Resolves with no value when the Supabase cleanup is triggered successfully, or rejects with an error when the Supabase cleanup fails.
 * @throws {Error} - When the Supabase cleanup fails.
 */
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
