const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
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

router.get("/me", protect, async (req, res) => {
  try {
    const { id, role } = req.user;

    let user = null;

    // --------------------------------------------------
    // STUDENT
    // --------------------------------------------------

    if (role === "student") {
      user = await Student.findById(id)
        .select("-password")
        .populate(
          "college",
          "collegeName collegeCode status"
        );
    }

    // --------------------------------------------------
    // COMPANY
    // --------------------------------------------------

    else if (role === "company") {
      user = await Company.findById(id)
        .select("-password");
    }

    // --------------------------------------------------
    // FACULTY
    // --------------------------------------------------

    else if (role === "faculty") {
      user = await Faculty.findById(id)
        .select("-password")
        .populate(
          "college",
          "collegeName collegeCode status"
        );
    }

    // --------------------------------------------------
    // COMPANY GUIDE
    // --------------------------------------------------

    else if (role === "companyGuide") {
      user = await CompanyGuide.findById(id)
        .select("-password")
        .populate(
          "company",
          "companyName email status"
        );
    }

    // --------------------------------------------------
    // COLLEGE ADMIN
    // --------------------------------------------------

    else if (role === "collegeAdmin") {
      user = await CollegeAdmin.findById(id)
        .select("-password")
        .populate(
          "college",
          "collegeName collegeCode status"
        );
    }

    // --------------------------------------------------
    // ADMIN
    // --------------------------------------------------

    else if (role === "admin") {
      user = await Admin.findById(id)
        .select("-password");
    }

    // --------------------------------------------------
    // INVALID ROLE
    // --------------------------------------------------

    else {
      clearAuthCookie(res);

      return res.status(401).json({
        status: "error",
        message: "Invalid session role",
      });
    }

    // --------------------------------------------------
    // USER NO LONGER EXISTS
    // --------------------------------------------------

    if (!user) {
      clearAuthCookie(res);

      return res.status(401).json({
        status: "error",
        message: "Session is no longer valid",
      });
    }

    // --------------------------------------------------
    // RETURN CURRENT SESSION
    // --------------------------------------------------

    res.status(200).json({
      status: "success",
      role: role,

      user: {
        ...user.toObject(),
        id: user._id,
      },
    });
  } catch (error) {
    console.error(
      "Session restore error:",
      error
    );

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

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

// ======================================================
// EXPORT
// ======================================================

module.exports = router;