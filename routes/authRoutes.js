const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { clearAuthCookie } = require("../utils/auth");

const Student = require("../models/Student");
const Company = require("../models/Company");
const Faculty = require("../models/Faculty");
const CompanyGuide = require("../models/CompanyGuide");
const CollegeAdmin = require("../models/CollegeAdmin");
const Admin = require("../models/Admin");

// ======================================================
// RESTORE CURRENT SESSION
// ======================================================

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { id, role } = req.user;

    let user = null;

    if (role === "student") {
      user = await Student.findById(id).select("-password");
    } else if (role === "company") {
      user = await Company.findById(id).select("-password");
    } else if (role === "faculty") {
      user = await Faculty.findById(id).select("-password");
    } else if (role === "companyGuide") {
      user = await CompanyGuide.findById(id).select("-password");
    } else if (role === "collegeAdmin") {
      user = await CollegeAdmin.findById(id)
        .select("-password")
        .populate(
          "college",
          "collegeName collegeCode status"
        );
    } else if (role === "admin") {
      user = await Admin.findById(id).select("-password");
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "User not found",
      });
    }

    res.json({
      status: "success",
      role,
      user: {
        ...user.toObject(),
        id: user._id,
      },
    });
  } catch (error) {
    console.error("Session restore error:", error);

    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

// ======================================================
// LOGOUT
// ======================================================

router.post("/logout", (req, res) => {
  clearAuthCookie(res);

  res.json({
    status: "success",
    message: "Logged out successfully",
  });
});

module.exports = router;