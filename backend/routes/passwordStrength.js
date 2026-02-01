const router = require("express").Router();

const checkPasswordStrength = (password) => {
  let score = 0;
  const feedback = [];

  if (password.length < 8) {
    feedback.push("Password is too short (min 8 characters).");
  } else if (password.length >= 8 && password.length < 12) {
    score += 1;
  } else if (password.length >= 12) {
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

  if (!password) {
    return res.status(400).json({ msg: "Password is required." });
  }

  const { score, feedback } = checkPasswordStrength(password);
  return res.status(200).json({ score, feedback });
});

module.exports = router;
