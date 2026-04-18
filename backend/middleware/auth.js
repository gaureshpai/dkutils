const jwt = require("jsonwebtoken");

/**
 * Auth middleware to verify authentication token.
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function in the middleware chain
 */
module.exports = function authMiddleware(req, res, next) {
	const token = req.header("x-auth-token");

	if (!token) {
		return next();
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded.user;
		return next();
	} catch (err) {
		return res.status(401).json({ msg: "Token is not valid" });
	}
};
