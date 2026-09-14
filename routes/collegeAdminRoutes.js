const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");

const CollegeAdmin = require("../models/CollegeAdmin");
const College = require("../models/College");

// ======================================================
// CREATE COLLEGE ADMIN
// ======================================================

router.post("/register", async (req, res) => {
  try {
    const {
      college,
      name,
      email,
      password,
      phone,
    } = req.body;

    if (
      !college ||
      !name ||
      !email ||
      !password ||
      !phone
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please fill all required fields",
      });
    }

    // Check whether college exists
    const existingCollege =
      await College.findById(college);

    if (!existingCollege) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    // College must be approved
    if (existingCollege.status !== "Approved") {
      return res.status(400).json({
        status: "error",
        message:
          "College must be approved by Platform Admin first",
      });
    }

    // Check existing admin
    const existingAdmin =
      await CollegeAdmin.findOne({ email });

    if (existingAdmin) {
      return res.status(400).json({
        status: "error",
        message:
          "College Admin email already registered",
      });
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    const collegeAdmin = new CollegeAdmin({
      college,
      name,
      email,
      password: hashedPassword,
      phone,
      status: "Active",
    });

    await collegeAdmin.save();

    res.status(201).json({
      status: "success",
      message:
        "College Admin registered successfully",
      collegeAdmin: {
        id: collegeAdmin._id,
        name: collegeAdmin.name,
        email: collegeAdmin.email,
        college: collegeAdmin.college,
        status: collegeAdmin.status,
      },
    });
  } catch (error) {
    console.error(
      "College Admin registration error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

// ======================================================
// COLLEGE ADMIN LOGIN
// ======================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message:
          "Please enter email and password",
      });
    }

    const collegeAdmin =
      await CollegeAdmin.findOne({ email })
        .populate(
          "college",
          "collegeName collegeCode status"
        );

    if (!collegeAdmin) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    if (collegeAdmin.status !== "Active") {
      return res.status(403).json({
        status: "error",
        message:
          "College Admin account is inactive",
      });
    }

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        collegeAdmin.password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    res.json({
      status: "success",
      message: "College Admin login successful",
      collegeAdmin: {
        id: collegeAdmin._id,
        name: collegeAdmin.name,
        email: collegeAdmin.email,
        phone: collegeAdmin.phone,
        college: collegeAdmin.college,
      },
    });
  } catch (error) {
    console.error(
      "College Admin login error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

module.exports = router;