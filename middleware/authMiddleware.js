
const { verifyToken, clearAuthCookie } = require("../utils/auth");

const protect = (req, res, next) => {
  try {
    const token = req.cookies?.internlink_token;

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const decoded = verifyToken(token);

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    // Remove expired or invalid authentication cookies.
    clearAuthCookie(res);

    return res.status(401).json({
      status: "error",
      message: "Session expired or invalid",
    });
  }
};

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

module.exports = { protect, authorize };
