const jwt = require("jsonwebtoken");

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

const setAuthCookie = (res, userId, role) => {
  const token = generateToken(userId, role);

  res.cookie("internlink_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 2 * 60 * 60 * 1000,
    path: "/",
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie("internlink_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
};

module.exports = {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
};