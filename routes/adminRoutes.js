const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const Company = require("../models/Company");
const College = require("../models/College");
const Admin = require("../models/Admin");

// ======================================================
// GET PENDING COMPANIES
// ======================================================

router.get("/pending-companies", async (req, res) => {
  try {
    const companies = await Company.find({
      status: "Pending",
    }).select("-password");

    res.status(200).json({
      status: "success",
      companies,
    });
  } catch (error) {
    console.error("Pending Companies Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch pending companies",
    });
  }
});

// ======================================================
// GET APPROVED COMPANIES
// ======================================================

router.get("/approved-companies", async (req, res) => {
  try {
    const companies = await Company.find({
      status: "Approved",
    }).select("-password");

    res.status(200).json({
      status: "success",
      companies,
    });
  } catch (error) {
    console.error("Approved Companies Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch approved companies",
    });
  }
});

// ======================================================
// APPROVE COMPANY
// ======================================================

router.put("/approve-company/:id", async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status: "Approved" },
      { new: true }
    ).select("-password");

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Company approved successfully",
      company,
    });
  } catch (error) {
    console.error("Approve Company Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to approve company",
    });
  }
});

// ======================================================
// REJECT COMPANY
// ======================================================

router.put("/reject-company/:id", async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status: "Rejected" },
      { new: true }
    ).select("-password");

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Company rejected successfully",
      company,
    });
  } catch (error) {
    console.error("Reject Company Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to reject company",
    });
  }
});

// ======================================================
// GET ALL COLLEGES
// ======================================================

router.get("/colleges", async (req, res) => {
  try {
    const colleges = await College.find().select("-password");

    res.status(200).json({
      status: "success",
      colleges,
    });
  } catch (error) {
    console.error("Get Colleges Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch colleges",
    });
  }
});

// ======================================================
// GET PENDING COLLEGES
// ======================================================

router.get("/pending-colleges", async (req, res) => {
  try {
    const colleges = await College.find({
      status: "Pending",
    }).select("-password");

    res.status(200).json({
      status: "success",
      colleges,
    });
  } catch (error) {
    console.error("Pending Colleges Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch pending colleges",
    });
  }
});

// ======================================================
// GET APPROVED COLLEGES
// ======================================================

router.get("/approved-colleges", async (req, res) => {
  try {
    const colleges = await College.find({
      status: "Approved",
    }).select("-password");

    res.status(200).json({
      status: "success",
      colleges,
    });
  } catch (error) {
    console.error("Approved Colleges Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch approved colleges",
    });
  }
});

// ======================================================
// APPROVE COLLEGE
// ======================================================

router.put("/approve-college/:id", async (req, res) => {
  try {
    const college = await College.findByIdAndUpdate(
      req.params.id,
      { status: "Approved" },
      { new: true }
    ).select("-password");

    if (!college) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "College approved successfully",
      college,
    });
  } catch (error) {
    console.error("Approve College Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to approve college",
    });
  }
});

// ======================================================
// REJECT COLLEGE
// ======================================================

router.put("/reject-college/:id", async (req, res) => {
  try {
    const college = await College.findByIdAndUpdate(
      req.params.id,
      { status: "Rejected" },
      { new: true }
    ).select("-password");

    if (!college) {
      return res.status(404).json({
        status: "error",
        message: "Failed to reject college",
      });
    }

    res.status(200).json({
      status: "success",
      message: "College rejected successfully",
      college,
    });
  } catch (error) {
    console.error("Reject College Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to reject college",
    });
  }
});

// ======================================================
// GET COLLEGE BY ID
// ======================================================

router.get("/colleges/:id", async (req, res) => {
  try {
    const college = await College.findById(
      req.params.id
    ).select("-password");

    if (!college) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    res.status(200).json({
      status: "success",
      college,
    });
  } catch (error) {
    console.error("Get College Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch college",
    });
  }
});

// ======================================================
// ADMIN CHANGE PASSWORD
// ======================================================

router.put("/change-password/:id", async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // Check all fields
    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please fill all password fields",
      });
    }

    // Check password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "New passwords do not match",
      });
    }

    // Check minimum password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message:
          "New password must be at least 6 characters",
      });
    }

    // Find admin
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        status: "error",
        message: "Admin not found",
      });
    }

    // Check current password
    const isPasswordCorrect =
      await bcrypt.compare(
        currentPassword,
        admin.password
      );

    if (!isPasswordCorrect) {
      return res.status(400).json({
        status: "error",
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword =
      await bcrypt.hash(newPassword, 10);

    // Save new password
    admin.password = hashedPassword;

    await admin.save();

    res.status(200).json({
      status: "success",
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error(
      "Admin Change Password Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to change password",
    });
  }
});

module.exports = router;