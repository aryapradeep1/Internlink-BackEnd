const express = require("express");
const bcrypt = require("bcryptjs");
const { setAuthCookie } = require("../utils/auth");
const { protect, authorize } = require("../middleware/authMiddleware");

const Student = require("../models/Student");
const College = require("../models/College");
const StudentVerification = require("../models/StudentVerification");

const router = express.Router();

// ======================================================
// VERIFY STUDENT USING COLLEGE EXCEL RECORD
// PUBLIC ROUTE
// ======================================================

router.post("/verify", async (req, res) => {
  try {
    const {
      name,
      college,
      registerNumber,
      verificationCode,
    } = req.body;

    // Check required fields
    if (
      !name ||
      !college ||
      !registerNumber ||
      !verificationCode
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Please enter Name, College, Register Number and Verification Code",
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

    // Only approved colleges can verify students
    if (existingCollege.status !== "Approved") {
      return res.status(400).json({
        status: "error",
        message:
          "Student verification is available only for approved colleges",
      });
    }

    // Find verification record uploaded by college
    const verificationRecord =
      await StudentVerification.findOne({
        college: college,
        registerNumber: registerNumber.trim(),
        verificationCode: verificationCode.trim(),
      });

    if (!verificationRecord) {
      return res.status(400).json({
        status: "error",
        message:
          "Invalid student details or verification code",
      });
    }

    // Check student name
    if (
      verificationRecord.name.trim().toLowerCase() !==
      name.trim().toLowerCase()
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Student name does not match the college record",
      });
    }

    // Check college name
    if (
      verificationRecord.collegeName
        .trim()
        .toLowerCase() !==
      existingCollege.collegeName
        .trim()
        .toLowerCase()
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "College does not match the verification record",
      });
    }

    // Check whether already registered
    if (verificationRecord.registered) {
      return res.status(400).json({
        status: "error",
        message:
          "This student has already registered",
      });
    }

    // Return verified information
    res.status(200).json({
      status: "success",
      message: "Student verified successfully",

      student: {
        name: verificationRecord.name,
        registerNumber:
          verificationRecord.registerNumber,
        department:
          verificationRecord.department,
        assignedFacultyName:
          verificationRecord.assignedFacultyName,
        college: existingCollege._id,
      },
    });
  } catch (error) {
    console.error(
      "Student verification error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Student verification failed",
    });
  }
});

// ======================================================
// STUDENT REGISTRATION
// PUBLIC ROUTE
// ======================================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      registerNumber,
      semester,
      phone,
      college,
      verificationCode,
    } = req.body;

    // Check required fields
    if (
      !name ||
      !email ||
      !password ||
      !registerNumber ||
      !semester ||
      !phone ||
      !college ||
      !verificationCode
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please fill all required fields",
      });
    }

    // Check college
    const existingCollege =
      await College.findById(college);

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

    // Find Excel verification record
    const verificationRecord =
      await StudentVerification.findOne({
        college: college,
        registerNumber:
          registerNumber.trim(),
        verificationCode:
          verificationCode.trim(),
      });

    if (!verificationRecord) {
      return res.status(400).json({
        status: "error",
        message:
          "Student details could not be verified. Please check your Name, College, Register Number and Verification Code.",
      });
    }

    // Check name
    if (
      verificationRecord.name
        .trim()
        .toLowerCase() !==
      name.trim().toLowerCase()
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Student name does not match the college verification record",
      });
    }

    // Check college name
    if (
      verificationRecord.collegeName
        .trim()
        .toLowerCase() !==
      existingCollege.collegeName
        .trim()
        .toLowerCase()
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "College information does not match the verification record",
      });
    }

    // Check already registered
    if (verificationRecord.registered) {
      return res.status(400).json({
        status: "error",
        message:
          "This student has already completed registration",
      });
    }

    // Check email
    const existingStudent =
      await Student.findOne({
        email: email.trim().toLowerCase(),
      });

    if (existingStudent) {
      return res.status(400).json({
        status: "error",
        message: "Email already registered",
      });
    }

    // Check register number
    const existingRegisterNumber =
      await Student.findOne({
        registerNumber:
          registerNumber.trim(),
      });

    if (existingRegisterNumber) {
      return res.status(400).json({
        status: "error",
        message:
          "Register number already registered",
      });
    }

    // Validate semester
    const semesterNumber = Number(semester);

    if (
      !Number.isInteger(semesterNumber) ||
      semesterNumber < 1
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please enter a valid semester",
      });
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Create student
    // Department and assigned faculty come from Excel
    const student = new Student({
      name: verificationRecord.name,

      email: email
        .trim()
        .toLowerCase(),

      password: hashedPassword,

      registerNumber:
        verificationRecord.registerNumber,

      department:
        verificationRecord.department,

      assignedFacultyName:
        verificationRecord.assignedFacultyName,

      semester: semesterNumber,

      phone: phone.trim(),

      college: college,
    });

    await student.save();

    // Mark verification record as registered
    verificationRecord.registered = true;
    verificationRecord.student = student._id;

    await verificationRecord.save();

    res.status(201).json({
      status: "success",
      message:
        "Student verified and registered successfully",

      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        registerNumber:
          student.registerNumber,
        department:
          student.department,
        assignedFacultyName:
          student.assignedFacultyName,
        semester: student.semester,
        phone: student.phone,
        college: student.college,
      },
    });
  } catch (error) {
    console.error(
      "Student registration error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Registration failed",
    });
  }
});

// ======================================================
// STUDENT LOGIN
// PUBLIC ROUTE
// ======================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const student =
      await Student.findOne({
        email,
      }).populate(
        "college",
        "collegeName collegeCode status"
      );

    if (!student) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        student.password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "error",
        message:
          "Invalid email or password",
      });
    }

    // Create secure HttpOnly session cookie
    setAuthCookie(
      res,
      student._id,
      "student"
    );

    res.status(200).json({
      status: "success",
      message: "Login successful",

      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        registerNumber:
          student.registerNumber,
        department:
          student.department,
        assignedFacultyName:
          student.assignedFacultyName,
        semester: student.semester,
        phone: student.phone,
        college: student.college,
      },
    });
  } catch (error) {
    console.error(
      "Student login error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Login failed",
    });
  }
});

// ======================================================
// GET STUDENT PROFILE
// PROTECTED + STUDENT ONLY
// ======================================================

router.get(
  "/profile/:id",
  protect,
  authorize("student"),
  async (req, res) => {
    try {
      // ------------------------------------------------
      // OWNERSHIP CHECK
      // A student can access only their own profile
      // ------------------------------------------------

      if (req.user.id.toString() !== req.params.id) {
        return res.status(403).json({
          status: "error",
          message:
            "You are not authorized to access this profile",
        });
      }

      const student =
        await Student.findById(
          req.params.id
        ).populate(
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
          registerNumber:
            student.registerNumber,
          department:
            student.department,
          assignedFacultyName:
            student.assignedFacultyName,
          semester: student.semester,
          phone: student.phone,
          college: student.college,
        },
      });
    } catch (error) {
      console.error(
        "Get student profile error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to get student profile",
      });
    }
  }
);

// ======================================================
// UPDATE STUDENT PROFILE
// PROTECTED + STUDENT ONLY
// ======================================================

router.put(
  "/profile/:id",
  protect,
  authorize("student"),
  async (req, res) => {
    try {
      // ------------------------------------------------
      // OWNERSHIP CHECK
      // A student can update only their own profile
      // ------------------------------------------------

      if (req.user.id.toString() !== req.params.id) {
        return res.status(403).json({
          status: "error",
          message:
            "You are not authorized to update this profile",
        });
      }

      const {
        name,
        email,
        department,
        semester,
        phone,
      } = req.body;

      if (
        !name ||
        !email ||
        !department ||
        !semester ||
        !phone
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Please fill all required fields",
        });
      }

      const student =
        await Student.findById(
          req.params.id
        );

      if (!student) {
        return res.status(404).json({
          status: "error",
          message:
            "Student not found",
        });
      }

      // Check whether another student
      // is using this email
      const existingStudent =
        await Student.findOne({
          email: email.trim().toLowerCase(),
          _id: {
            $ne: req.params.id,
          },
        });

      if (existingStudent) {
        return res.status(400).json({
          status: "error",
          message:
            "Email already used by another student",
        });
      }

      student.name = name;
      student.email =
        email.trim().toLowerCase();
      student.department = department;
      student.semester = semester;
      student.phone = phone;

      // assignedFacultyName is intentionally
      // NOT changed by the student.
      // It comes from the college Excel record.

      await student.save();

      res.status(200).json({
        status: "success",
        message:
          "Profile updated successfully",

        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          registerNumber:
            student.registerNumber,
          department:
            student.department,
          assignedFacultyName:
            student.assignedFacultyName,
          semester: student.semester,
          phone: student.phone,
          college: student.college,
        },
      });
    } catch (error) {
      console.error(
        "Update student profile error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to update profile",
      });
    }
  }
);

// ======================================================
// CHANGE STUDENT PASSWORD
// PROTECTED + STUDENT ONLY
// ======================================================

router.put(
  "/change-password/:id",
  protect,
  authorize("student"),
  async (req, res) => {
    try {
      // ------------------------------------------------
      // OWNERSHIP CHECK
      // A student can change only their own password
      // ------------------------------------------------

      if (req.user.id.toString() !== req.params.id) {
        return res.status(403).json({
          status: "error",
          message:
            "You are not authorized to change this password",
        });
      }

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
          message:
            "Please fill all password fields",
        });
      }

      if (
        newPassword !== confirmPassword
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "New passwords do not match",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          status: "error",
          message:
            "New password must be at least 6 characters",
        });
      }

      const student =
        await Student.findById(
          req.params.id
        );

      if (!student) {
        return res.status(404).json({
          status: "error",
          message:
            "Student not found",
        });
      }

      // Check current password
      const isPasswordCorrect =
        await bcrypt.compare(
          currentPassword,
          student.password
        );

      if (!isPasswordCorrect) {
        return res.status(401).json({
          status: "error",
          message:
            "Current password is incorrect",
        });
      }

      // Hash new password
      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          10
        );

      student.password =
        hashedPassword;

      await student.save();

      res.status(200).json({
        status: "success",
        message:
          "Password changed successfully",
      });
    } catch (error) {
      console.error(
        "Change student password error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to change password",
      });
    }
  }
);

// ======================================================
// EXPORT
// ======================================================

module.exports = router;