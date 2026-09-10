const express = require("express");
const bcrypt = require("bcryptjs");
const CompanyGuide = require("../models/CompanyGuide");
const Company = require("../models/Company");

const router = express.Router();

// Company Guide Registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, company, employeeId, password } = req.body;

    if (!name || !email || !company || !employeeId || !password) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required",
      });
    }

    const existingGuide = await CompanyGuide.findOne({ email });

    if (existingGuide) {
      return res.status(400).json({
        status: "error",
        message: "Company Guide already registered with this email",
      });
    }

    const companyExists = await Company.findById(company);

    if (!companyExists) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const guide = await CompanyGuide.create({
      name,
      email,
      company,
      employeeId,
      password: hashedPassword,
      status: "Pending",
    });

    res.status(201).json({
      status: "success",
      message: "Company Guide registered successfully. Waiting for company approval.",
      guide: {
        id: guide._id,
        name: guide.name,
        email: guide.email,
        company: guide.company,
        employeeId: guide.employeeId,
        status: guide.status,
      },
    });
  } catch (error) {
    console.error("Company Guide Registration Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to register Company Guide",
      error: error.message,
    });
  }
});


// Company Guide Approval / Rejection
router.put("/status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status",
      });
    }

    const guide = await CompanyGuide.findById(req.params.id);

    if (!guide) {
      return res.status(404).json({
        status: "error",
        message: "Company Guide not found",
      });
    }

    guide.status = status;

    await guide.save();

    res.json({
      status: "success",
      message: `Company Guide ${status.toLowerCase()} successfully`,
      guide: {
        id: guide._id,
        name: guide.name,
        email: guide.email,
        company: guide.company,
        employeeId: guide.employeeId,
        status: guide.status,
      },
    });
  } catch (error) {
    console.error("Company Guide Status Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to update Company Guide status",
      error: error.message,
    });
  }
});

// Company Guide Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    const guide = await CompanyGuide.findOne({ email });

    if (!guide) {
      return res.status(404).json({
        status: "error",
        message: "Company Guide not found",
      });
    }

    if (guide.status !== "Approved") {
      return res.status(403).json({
        status: "error",
        message: "Company Guide is not approved yet",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      guide.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid password",
      });
    }

    res.json({
      status: "success",
      message: "Company Guide login successful",
      guide: {
        id: guide._id,
        name: guide.name,
        email: guide.email,
        company: guide.company,
        employeeId: guide.employeeId,
        status: guide.status,
      },
    });
  } catch (error) {
    console.error("Company Guide Login Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to login",
      error: error.message,
    });
  }
});

module.exports = router;