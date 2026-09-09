const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const Faculty = require("../models/Faculty");
const Application = require("../models/Application");

// ==========================================
// ADD FACULTY
// ==========================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      department,
      phone,
      designation,
    } = req.body;

    // Check required fields
    if (!name || !email || !password || !department || !phone) {
      return res.status(400).json({
        status: "error",
        message: "Please provide all required fields",
      });
    }

    // Check if faculty already exists
    const existingFaculty = await Faculty.findOne({ email });

    if (existingFaculty) {
      return res.status(400).json({
        status: "error",
        message: "Faculty with this email already exists",
      });
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create faculty
    const faculty = new Faculty({
  name,
  email,
  password: hashedPassword,
  department,
  phone,
  designation: designation || "Faculty",
  status: "Pending",
});

    await faculty.save();

    res.status(201).json({
      status: "success",
      message: "Faculty added successfully",
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        phone: faculty.phone,
        designation: faculty.designation,
      },
    });
  } catch (error) {
    console.error("Add Faculty Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to add faculty",
      error: error.message,
    });
  }
});

// ==========================================
// GET ALL FACULTY
// ==========================================

router.get("/", async (req, res) => {
  try {
    const faculty = await Faculty.find()
      .select("-password")
      .sort({ name: 1 });

    res.status(200).json({
      status: "success",
      faculty,
    });
  } catch (error) {
    console.error("Get Faculty Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch faculty",
      error: error.message,
    });
  }
});


// ==========================================
// FACULTY LOGIN
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    const faculty = await Faculty.findOne({ email });

    if (!faculty) {
      return res.status(400).json({
        status: "error",
        message: "Faculty not found",
      });
    }

    // Check faculty approval status
if (faculty.status !== "Approved") {
  return res.status(403).json({
    status: "error",
    message:
      faculty.status === "Pending"
        ? "Your account is waiting for admin approval"
        : "Your faculty account has been rejected",
  });
}

    const isMatch = await bcrypt.compare(password, faculty.password);

    if (!isMatch) {
      return res.status(400).json({
        status: "error",
        message: "Invalid password",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Faculty login successful",
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        phone: faculty.phone,
        designation: faculty.designation,
        status: faculty.status,
      },
    });
  } catch (error) {
    console.error("Faculty Login Error:", error);

    res.status(500).json({
      status: "error",
      message: "Faculty login failed",
      error: error.message,
    });
  }
});

// ======================================================
// GET APPLICATIONS ASSIGNED TO A FACULTY
// ======================================================

router.get("/applications/:facultyId", async (req, res) => {
  try {
    const { facultyId } = req.params;

    const applications = await Application.find({
      faculty: facultyId,
      status: "CollegeApproved",
    })
      .populate(
        "student",
        "name email registerNumber department semester phone"
      )
      .populate(
        "company",
        "companyName email location"
      )
      .populate(
        "internship",
        "title description location duration eligibility skillsRequired deadline"
      )
      .populate(
        "faculty",
        "name email department phone designation"
      );

    res.status(200).json({
      status: "success",
      applications,
    });
  } catch (error) {
    console.error(
      "Get Faculty Applications Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch assigned applications",
      error: error.message,
    });
  }
});

module.exports = router;