const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
  const token = req.header("x-auth-token");

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    req.user.role = decoded.user.role;
    return next();
  } catch (err) {
    return res.status(401).json({ msg: "Token is not valid" });
  }
};
