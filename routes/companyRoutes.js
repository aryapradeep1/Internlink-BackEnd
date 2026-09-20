const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const Company = require("../models/Company");

// Company self-registration
router.post("/register", async (req, res) => {
  try {
    const {
      companyName,
      email,
      password,
      description,
      location,
      internshipPosition,
      eligibility,
      skillsRequired,
      duration,
      deadline,
    } = req.body;

    // Check whether company email already exists
    const existingCompany = await Company.findOne({ email });

    if (existingCompany) {
      return res.status(400).json({
        status: "error",
        message: "Company with this email already exists",
      });
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create company
    // Status automatically becomes Pending
    const company = new Company({
      companyName,
      email,
      password: hashedPassword,
      description,
      location,
      internshipPosition,
      eligibility,
      skillsRequired,
      duration,
      deadline,
    });

    await company.save();

    res.status(201).json({
      status: "success",
      message:
        "Company registration submitted successfully. Please wait for admin approval.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Company registration failed",
      error: error.message,
    });
  }
});

// Company login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const company = await Company.findOne({ email });

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    // Check whether admin approved the company
    if (company.status === "Pending") {
      return res.status(403).json({
        status: "error",
        message: "Your company registration is pending admin approval",
      });
    }

    if (company.status === "Rejected") {
      return res.status(403).json({
        status: "error",
        message: "Your company registration was rejected by the admin",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      password,
      company.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid password",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Company login successful",
      company: {
        id: company._id,
        companyName: company.companyName,
        email: company.email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Company login failed",
      error: error.message,
    });
  }
});

// Get all companies
router.get("/", async (req, res) => {
  try {
    const companies = await Company.find();

    res.status(200).json({
      status: "success",
      companies,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch companies",
      error: error.message,
    });
  }
});

// Get company profile
router.get("/profile/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).select(
      "-password"
    );

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    res.status(200).json({
      status: "success",
      company,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch company profile",
    });
  }
});


// Update company profile
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
        message: "Company not found",
      });
    }

    // Check whether another company already uses this email
    const existingCompany = await Company.findOne({
      email,
      _id: { $ne: req.params.id },
    });

    if (existingCompany) {
      return res.status(400).json({
        status: "error",
        message: "Another company already uses this email",
      });
    }

    company.companyName = companyName;
    company.email = email;
    company.description = description;
    company.location = location;

    await company.save();

    res.status(200).json({
      status: "success",
      message: "Company profile updated successfully",
      company: {
        id: company._id,
        companyName: company.companyName,
        email: company.email,
        description: company.description,
        location: company.location,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to update company profile",
    });
  }
});


// Change company password
router.put("/change-password/:id", async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "New passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "New password must be at least 6 characters",
      });
    }

    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      company.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    company.password = hashedPassword;

    await company.save();

    res.status(200).json({
      status: "success",
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to change password",
    });
  }
});

// Get company by ID
router.get("/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    res.status(200).json({
      status: "success",
      company,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch company",
      error: error.message,
    });
  }
});

module.exports = router;