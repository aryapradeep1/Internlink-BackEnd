
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { setAuthCookie } = require("../utils/auth");

const Company = require("../models/Company");
const { notifyAdmins } = require("../utils/notifications");

// =====================================================
// COMPANY REGISTRATION
// =====================================================
router.post("/register", async (req, res) => {
  try {
    const {
      companyName,
      email,
      password,
      description,
      location,
    } = req.body;

    // Validate required fields
    if (
      !companyName?.trim() ||
      !email?.trim() ||
      !password ||
      !location?.trim()
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please fill in all required fields.",
      });
    }

    // Validate company description
    if (
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please enter a company description.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check whether company email already exists
    const existingCompany = await Company.findOne({
      email: normalizedEmail,
    });

    if (existingCompany) {
      return res.status(400).json({
        status: "error",
        message: "Company with this email already exists.",
      });
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create company and explicitly save description
    const company = new Company({
      companyName: companyName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      description: description.trim(),
      location: location.trim(),
      status: "Pending",
    });

    await company.save();
    await notifyAdmins({ type: "company_registration", message: `New company registration request: ${company.companyName}`, relatedEntityId: company._id, target: "requests", eventKey: `company-registration:${company._id}` });

    console.log("Company registered successfully:", {
      id: company._id,
      description: company.description,
    });

    return res.status(201).json({
      status: "success",
      message:
        "Company registration submitted successfully. Please wait for admin approval.",
    });
  } catch (error) {
    console.error("COMPANY REGISTRATION ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Company registration failed.",
      error: error.message,
    });
  }
});

// =====================================================
// COMPANY LOGIN
// =====================================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const company = await Company.findOne({
      email: email?.trim().toLowerCase(),
    });

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found.",
      });
    }

    // Check admin approval
    if (company.status === "Pending") {
      return res.status(403).json({
        status: "error",
        message:
          "Your company registration is pending admin approval.",
      });
    }

    if (company.status === "Rejected") {
      return res.status(403).json({
        status: "error",
        message:
          "Your company registration was rejected by the admin.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      company.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid password.",
      });
    }

    setAuthCookie(res, company._id, "company");

    return res.status(200).json({
      status: "success",
      message: "Company login successful.",
      company: {
        id: company._id,
        companyName: company.companyName,
        email: company.email,
        description: company.description,
        location: company.location,
      },
    });
  } catch (error) {
    console.error("COMPANY LOGIN ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Company login failed.",
      error: error.message,
    });
  }
});

// =====================================================
// GET ALL COMPANIES
// =====================================================
router.get("/", async (req, res) => {
  try {
    const companies = await Company.find().select("-password");

    return res.status(200).json({
      status: "success",
      companies,
    });
  } catch (error) {
    console.error("GET ALL COMPANIES ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to fetch companies.",
      error: error.message,
    });
  }
});

// =====================================================
// GET COMPANY PROFILE
// =====================================================
router.get("/profile/:id", async (req, res) => {
  try {
    const company = await Company.findById(
      req.params.id
    ).select("-password");

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found.",
      });
    }

    return res.status(200).json({
      status: "success",
      company,
    });
  } catch (error) {
    console.error("GET COMPANY PROFILE ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to fetch company profile.",
      error: error.message,
    });
  }
});

// =====================================================
// UPDATE COMPANY PROFILE
// =====================================================
router.put("/profile/:id", async (req, res) => {
  try {
    const {
      companyName,
      email,
      description,
      location,
    } = req.body;

    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found.",
      });
    }

    // Check whether another company uses this email
    if (email?.trim()) {
      const normalizedEmail = email.trim().toLowerCase();

      const existingCompany = await Company.findOne({
        email: normalizedEmail,
        _id: { $ne: req.params.id },
      });

      if (existingCompany) {
        return res.status(400).json({
          status: "error",
          message:
            "Another company already uses this email.",
        });
      }

      company.email = normalizedEmail;
    }

    if (typeof companyName === "string") {
      company.companyName = companyName.trim();
    }

    // Update description only when supplied
    if (typeof description === "string") {
      company.description = description.trim();
    }

    if (typeof location === "string") {
      company.location = location.trim();
    }

    await company.save();

    return res.status(200).json({
      status: "success",
      message: "Company profile updated successfully.",
      company: {
        id: company._id,
        companyName: company.companyName,
        email: company.email,
        description: company.description,
        location: company.location,
      },
    });
  } catch (error) {
    console.error("UPDATE COMPANY PROFILE ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to update company profile.",
      error: error.message,
    });
  }
});

// =====================================================
// CHANGE COMPANY PASSWORD
// =====================================================
router.put("/change-password/:id", async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please fill in all password fields.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "New passwords do not match.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message:
          "New password must be at least 6 characters.",
      });
    }

    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      company.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Current password is incorrect.",
      });
    }

    company.password = await bcrypt.hash(
      newPassword,
      10
    );

    await company.save();

    return res.status(200).json({
      status: "success",
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("CHANGE COMPANY PASSWORD ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to change password.",
      error: error.message,
    });
  }
});

// =====================================================
// GET COMPANY BY ID
// Keep this route after /profile/:id
// =====================================================
router.get("/:id", async (req, res) => {
  try {
    const company = await Company.findById(
      req.params.id
    ).select("-password");

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found.",
      });
    }

    return res.status(200).json({
      status: "success",
      company,
    });
  } catch (error) {
    console.error("GET COMPANY BY ID ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to fetch company.",
      error: error.message,
    });
  }
});

module.exports = router;
