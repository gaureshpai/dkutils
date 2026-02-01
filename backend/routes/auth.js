const router = require("express").Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post(
  "/register",
  [
    check("username", "Username is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters",
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;
    const maskedEmail = email
      ? email.replace(/^(.{2}).*(@.*)$/, "$1***$2")
      : undefined;
    if (process.env.NODE_ENV !== "production") {
      console.log("Register attempt:", { username, maskedEmail });
    }

    try {
      let user = await User.findOne({ email });
      if (user) {
        console.log("User already exists");
        return res.status(400).json({ msg: "User already exists" });
      }

      user = new User({
        username,
        email,
        password,
      });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      console.log("Saving user...");
      await user.save();
      console.log("User saved:", user.id);

      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      console.log("Signing token...");
      const token = await new Promise((resolve, reject) => {
        if (!process.env.JWT_SECRET) {
          console.error("JWT_SECRET is missing!");
          reject(new Error("JWT_SECRET is missing"));
        }
        jwt.sign(
          payload,
          process.env.JWT_SECRET,
          { expiresIn: "1h" },
          (err, tokenValue) => {
            if (err) reject(err);
            resolve(tokenValue);
          },
        );
      });
      console.log("Token generated");
      return res.json({ token });
    } catch (err) {
      console.error("Register error:", err.message);
      return res.status(500).json({ msg: "Server error" });
    }
  },
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      let user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ msg: "Invalid Credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ msg: "Invalid Credentials" });
      }

      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      const token = await new Promise((resolve, reject) => {
        jwt.sign(
          payload,
          process.env.JWT_SECRET,
          { expiresIn: "1h" },
          (err, tokenValue) => {
            if (err) reject(err);
            resolve(tokenValue);
          },
        );
      });
      return res.json({ token });
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: "Server error" });
    }
  },
);

module.exports = router;
