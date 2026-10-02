const { verifyToken } = require("../utils/auth");

// ======================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================

const protect = (req, res, next) => {
  try {
    const token = req.cookies?.internlink_token;

    // No login cookie
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Verify JWT
    const decoded = verifyToken(token);

    // Store authenticated user information
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      status: "error",
      message: "Session expired or invalid",
    });
  }
};

// ======================================================
// ROLE AUTHORIZATION
// ======================================================

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
};