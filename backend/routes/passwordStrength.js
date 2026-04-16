const router = require("express").Router();

/**
 * Checks the strength of a given password.
 * The strength is determined by the following rules:
 * - The password must be at least 8 characters long.
 * - The password must contain at least one uppercase letter, one lowercase letter, one number, and one symbol.
 * - The strength is determined by the length of the password and the number of character types it contains.
 * - If the password is too short, it is considered weak.
 * - If the password is at least 8 characters long but contains only one or two types of characters, it is considered medium.
 * - If the password is at least 12 characters long and contains at least three types of characters, it is considered strong.
 * @param {string} password - The password to check.
 * @returns {{score: number, feedback: Array<string>}} - An object containing the strength score and the feedback array.
 */
const checkPasswordStrength = (password) => {
	let score = 0;
	const feedback = [];

	if (password.length < 8) {
		feedback.push("Password is too short (min 8 characters).");
		score = 0;
		return { score, feedback };
	}

	if (password.length < 12) {
		score += 1;
	} else {
		score += 2;
	}

	if (/[A-Z]/.test(password)) {
		score += 1;
	} else {
		feedback.push("Add uppercase letters.");
	}

	if (/[a-z]/.test(password)) {
		score += 1;
	} else {
		feedback.push("Add lowercase letters.");
	}

	if (/[0-9]/.test(password)) {
		score += 1;
	} else {
		feedback.push("Add numbers.");
	}

	if (/[^A-Za-z0-9]/.test(password)) {
		score += 1;
	} else {
		feedback.push("Add symbols.");
	}

	if (score < 3 && password.length > 0) {
		feedback.unshift("Consider making your password stronger.");
	}

	return { score, feedback };
};

// @route   POST /api/password-strength
// @desc    Check the strength of a given password
// @access  Public
router.post("/", (req, res) => {
	const { password } = req.body;

	if (typeof password !== "string" || password.length === 0 || password.trim().length === 0) {
		return res.status(400).json({ msg: "Password is required." });
	}

	const { score, feedback } = checkPasswordStrength(password);
	return res.status(200).json({ score, feedback });
});

module.exports = router;