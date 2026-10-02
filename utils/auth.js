const jwt = require("jsonwebtoken");

// ======================================================
// GENERATE JWT TOKEN
// ======================================================

const generateToken = (userId, role) => {
  return jwt.sign(
    {
      id: userId,
      role: role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "2h",
    }
  );
};

// ======================================================
// SET AUTH COOKIE
// ======================================================

const setAuthCookie = (res, userId, role) => {
  const token = generateToken(userId, role);

  res.cookie("internlink_token", token, {
    httpOnly: true,

    // HTTPS only in production
    secure: process.env.NODE_ENV === "production",

    // Prevent cross-site cookie requests
    sameSite: "strict",

    // Cookie expires after 2 hours
    maxAge: 2 * 60 * 60 * 1000,

    path: "/",
  });
};

// ======================================================
// CLEAR AUTH COOKIE
// ======================================================

const clearAuthCookie = (res) => {
  res.clearCookie("internlink_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
};

// ======================================================
// VERIFY AUTH COOKIE
// ======================================================

const verifyToken = (token) => {
  return jwt.verify(
    token,
    process.env.JWT_SECRET
  );
};

module.exports = {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  verifyToken,
};