const express = require("express");
const bcrypt = require("bcryptjs");

const Student = require("../models/Student");
const College = require("../models/College");

const router = express.Router();

// Student Registration
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      registerNumber,
      department,
      semester,
      phone,
      college,
    } = req.body;

    // Check required fields
    if (
      !name ||
      !email ||
      !password ||
      !registerNumber ||
      !department ||
      !semester ||
      !phone ||
      !college
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please fill all required fields",
      });
    }

    // Check if email already exists
    const existingStudent = await Student.findOne({ email });

    if (existingStudent) {
      return res.status(400).json({
        status: "error",
        message: "Email already registered",
      });
    }

    // Check if register number already exists
    const existingRegisterNumber =
      await Student.findOne({ registerNumber });

    if (existingRegisterNumber) {
      return res.status(400).json({
        status: "error",
        message: "Register number already registered",
      });
    }

    // Check college
    const existingCollege = await College.findById(college);

    if (!existingCollege) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    // Only approved colleges can have students
    if (existingCollege.status !== "Approved") {
      return res.status(400).json({
        status: "error",
        message:
          "Student can register only under an approved college",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const student = new Student({
      name,
      email,
      password: hashedPassword,
      registerNumber,
      department,
      semester,
      phone,
      college,
    });

    await student.save();

    res.status(201).json({
      status: "success",
      message: "Student registered successfully",
    });
  } catch (error) {
    console.error("Student registration error:", error);

    res.status(500).json({
      status: "error",
      message: "Registration failed",
    });
  }
});

// Student Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find student by email
    const student = await Student.findOne({ email }).populate(
      "college",
      "collegeName collegeCode status"
    );

    if (!student) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }

    // Check password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      student.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Login successful",
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        registerNumber: student.registerNumber,
        department: student.department,
        semester: student.semester,
        phone: student.phone,
        college: student.college,
      },
    });
  } catch (error) {
    console.error("Student login error:", error);

    res.status(500).json({
      status: "error",
      message: "Login failed",
    });
  }
});


// ======================================================
// GET STUDENT PROFILE
// ======================================================

router.get("/profile/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate(
      "college",
      "collegeName collegeCode status"
    );

    if (!student) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }

    res.status(200).json({
      status: "success",
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        registerNumber: student.registerNumber,
        department: student.department,
        semester: student.semester,
        phone: student.phone,
        college: student.college,
      },
    });
  } catch (error) {
    console.error("Get student profile error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to get student profile",
    });
  }
});

// ======================================================
// UPDATE STUDENT PROFILE
// ======================================================

router.put("/profile/:id", async (req, res) => {
  try {
    const {
      name,
      email,
      department,
      semester,
      phone,
    } = req.body;

    if (!name || !email || !department || !semester || !phone) {
      return res.status(400).json({
        status: "error",
        message: "Please fill all required fields",
      });
    }

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }

    // Check whether another student is using this email
    const existingStudent = await Student.findOne({
      email,
      _id: { $ne: req.params.id },
    });

    if (existingStudent) {
      return res.status(400).json({
        status: "error",
        message: "Email already used by another student",
      });
    }

    student.name = name;
    student.email = email;
    student.department = department;
    student.semester = semester;
    student.phone = phone;

    await student.save();

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        registerNumber: student.registerNumber,
        department: student.department,
        semester: student.semester,
        phone: student.phone,
        college: student.college,
      },
    });
  } catch (error) {
    console.error("Update student profile error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to update profile",
    });
  }
});

// ======================================================
// CHANGE STUDENT PASSWORD
// ======================================================

router.put("/change-password/:id", async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "Please fill all password fields",
      });
    }

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

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }

    // Check current password
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      student.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "error",
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    student.password = hashedPassword;

    await student.save();

    res.status(200).json({
      status: "success",
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change student password error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to change password",
    });
  }
});


// Keep this at the VERY END
module.exports = router;