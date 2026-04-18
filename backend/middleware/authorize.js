/**
 * Returns a middleware function that checks if the user is authorized and has the required role(s).
 * @param {string[]} roles - An array of roles that are allowed to access the route.
 * @returns {(req, res, next) => void} - A middleware function that checks if the user is authorized and has the required role(s).
 */
module.exports = (roles) => (req, res, next) => {
	if (!req.user || !req.user.role) {
		return res.status(401).json({ msg: "Not authorized" });
	}

	if (!roles.includes(req.user.role)) {
		return res.status(403).json({ msg: "Forbidden: Insufficient role" });
	}

	return next();
};
