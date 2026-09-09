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