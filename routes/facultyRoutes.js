const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const { setAuthCookie } = require("../utils/auth");
const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const Faculty = require("../models/Faculty");
const FacultyVerification = require("../models/FacultyVerification");
const StudentVerification = require("../models/StudentVerification");
const Student = require("../models/Student");
const Application = require("../models/Application");
const College = require("../models/College");

// ======================================================
// VERIFY FACULTY USING COLLEGE EXCEL RECORD
// ======================================================

router.post("/verify", async (req, res) => {
  try {
    const {
      name,
      college,
      department,
      verificationCode,
    } = req.body;

    if (
      !name ||
      !college ||
      !department ||
      !verificationCode
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Name, college, department and verification code are required",
      });
    }

    // Check college
    const collegeExists = await College.findById(college);

    if (!collegeExists) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    // Only approved colleges can verify faculty
    if (collegeExists.status !== "Approved") {
      return res.status(403).json({
        status: "error",
        message: "This college is not approved",
      });
    }

    // Find matching Excel verification record
    const verification =
      await FacultyVerification.findOne({
        college: college,
        name: name.trim(),
        department: department.trim(),
        verificationCode:
          verificationCode.trim(),
        registered: false,
      });

    if (!verification) {
      return res.status(400).json({
        status: "error",
        message:
          "Faculty verification failed. Please check your name, college, department and verification code.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Faculty verified successfully",

      faculty: {
        name: verification.name,
        college: verification.college,
        department: verification.department,
      },
    });
  } catch (error) {
    console.error(
      "Faculty Verification Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Faculty verification failed",
      error: error.message,
    });
  }
});

// ======================================================
// FACULTY REGISTRATION
// ======================================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      department,
      phone,
      designation,
      college,
      verificationCode,
    } = req.body;

    // Check required fields
    if (
      !name ||
      !email ||
      !password ||
      !department ||
      !phone ||
      !college ||
      !verificationCode
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Please provide all required fields",
      });
    }

    // Check college
    const collegeExists =
      await College.findById(college);

    if (!collegeExists) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    // Only approved colleges can have faculty
    if (collegeExists.status !== "Approved") {
      return res.status(403).json({
        status: "error",
        message: "This college is not approved",
      });
    }

    // Find matching verification record
    const verification =
      await FacultyVerification.findOne({
        college: college,
        name: name.trim(),
        department: department.trim(),
        verificationCode:
          verificationCode.trim(),
        registered: false,
      });

    if (!verification) {
      return res.status(400).json({
        status: "error",
        message:
          "Faculty verification failed. Please verify your details using the college verification code.",
      });
    }

    // Check email
    const existingFaculty =
      await Faculty.findOne({
        email: email.trim().toLowerCase(),
      });

    if (existingFaculty) {
      return res.status(400).json({
        status: "error",
        message:
          "Faculty with this email already exists",
      });
    }

    // Encrypt password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Create faculty
    const faculty = new Faculty({
      name: verification.name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      department: verification.department,
      phone,
      designation:
        designation || "Faculty",
      college,
      status: "Approved",
    });

    await faculty.save();

    // Mark verification record as registered
    verification.registered = true;
    verification.faculty = faculty._id;

    await verification.save();

    res.status(201).json({
      status: "success",
      message:
        "Faculty registration successful. Your faculty account has been approved.",
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        phone: faculty.phone,
        designation: faculty.designation,
        college: faculty.college,
        status: faculty.status,
      },
    });
  } catch (error) {
    console.error(
      "Faculty Registration Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to register faculty",
      error: error.message,
    });
  }
});

// ======================================================
// GET ALL FACULTY
// ======================================================

router.get("/", async (req, res) => {
  try {
    const faculty = await Faculty.find()
      .select("-password")
      .populate(
        "college",
        "collegeName collegeCode"
      )
      .sort({ name: 1 });

    res.status(200).json({
      status: "success",
      faculty,
    });
  } catch (error) {
    console.error(
      "Get Faculty Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch faculty",
      error: error.message,
    });
  }
});

// ======================================================
// FACULTY LOGIN
// ======================================================

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message:
          "Email and password are required",
      });
    }

    const faculty =
      await Faculty.findOne({
        email: email.trim().toLowerCase(),
      }).populate(
        "college",
        "collegeName collegeCode status"
      );

    if (!faculty) {
      return res.status(400).json({
        status: "error",
        message: "Faculty not found",
      });
    }

    // Faculty must be approved
    if (faculty.status !== "Approved") {
      return res.status(403).json({
        status: "error",
        message:
          "Your faculty account is not approved",
      });
    }

    const isMatch =
      await bcrypt.compare(
        password,
        faculty.password
      );

    if (!isMatch) {
      return res.status(400).json({
        status: "error",
        message: "Invalid password",
      });
    }

    // Create login session
    setAuthCookie(
      res,
      faculty._id,
      "faculty"
    );

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
        college: faculty.college,
        status: faculty.status,
      },
    });
  } catch (error) {
    console.error(
      "Faculty Login Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Faculty login failed",
      error: error.message,
    });
  }
});

// ======================================================
// GET FACULTY PROFILE
// ======================================================

router.get(
  "/profile/:id",
  async (req, res) => {
    try {
      const faculty =
        await Faculty.findById(
          req.params.id
        )
          .select("-password")
          .populate(
            "college",
            "collegeName collegeCode"
          );

      if (!faculty) {
        return res.status(404).json({
          status: "error",
          message: "Faculty not found",
        });
      }

      res.status(200).json({
        status: "success",
        faculty,
      });
    } catch (error) {
      console.error(
        "Get Faculty Profile Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to fetch faculty profile",
      });
    }
  }
);

// ======================================================
// UPDATE FACULTY PROFILE
// ======================================================

router.put(
  "/profile/:id",
  async (req, res) => {
    try {
      const {
        name,
        email,
        department,
        phone,
        designation,
      } = req.body;

      const faculty =
        await Faculty.findById(
          req.params.id
        );

      if (!faculty) {
        return res.status(404).json({
          status: "error",
          message: "Faculty not found",
        });
      }

      // Check duplicate email
      const existingFaculty =
        await Faculty.findOne({
          email: email
            ?.trim()
            .toLowerCase(),
          _id: {
            $ne: req.params.id,
          },
        });

      if (existingFaculty) {
        return res.status(400).json({
          status: "error",
          message:
            "Another faculty member already uses this email",
        });
      }

      faculty.name = name;
      faculty.email =
        email.trim().toLowerCase();
      faculty.department =
        department;
      faculty.phone = phone;
      faculty.designation =
        designation;

      await faculty.save();

      res.status(200).json({
        status: "success",
        message:
          "Faculty profile updated successfully",

        faculty: {
          id: faculty._id,
          name: faculty.name,
          email: faculty.email,
          department:
            faculty.department,
          phone: faculty.phone,
          designation:
            faculty.designation,
          college: faculty.college,
          status: faculty.status,
        },
      });
    } catch (error) {
      console.error(
        "Update Faculty Profile Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to update faculty profile",
      });
    }
  }
);

// ======================================================
// CHANGE FACULTY PASSWORD
// ======================================================

router.put(
  "/change-password/:id",
  async (req, res) => {
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
          message:
            "All password fields are required",
        });
      }

      if (
        newPassword !==
        confirmPassword
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

      const faculty =
        await Faculty.findById(
          req.params.id
        );

      if (!faculty) {
        return res.status(404).json({
          status: "error",
          message: "Faculty not found",
        });
      }

      const isPasswordValid =
        await bcrypt.compare(
          currentPassword,
          faculty.password
        );

      if (!isPasswordValid) {
        return res.status(401).json({
          status: "error",
          message:
            "Current password is incorrect",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          10
        );

      faculty.password =
        hashedPassword;

      await faculty.save();

      res.status(200).json({
        status: "success",
        message:
          "Password changed successfully",
      });
    } catch (error) {
      console.error(
        "Change Faculty Password Error:",
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
// GET APPLICATIONS ASSIGNED TO FACULTY
// ======================================================

router.get(
  "/applications/:facultyId",
  async (req, res) => {
    try {
      const { facultyId } =
        req.params;

      const applications =
        await Application.find({
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
        message:
          "Failed to fetch assigned applications",
        error: error.message,
      });
    }
  }
);

// ======================================================
// GET STUDENTS ASSIGNED TO FACULTY
// FROM COLLEGE STUDENT EXCEL VERIFICATION LIST
// ======================================================

router.get(
  "/students/:facultyId",
  protect,
  authorize("faculty"),
  async (req, res) => {
    try {
      const { facultyId } =
        req.params;

      // Faculty can only access their own students
      if (
        req.user.id.toString() !==
        facultyId.toString()
      ) {
        return res.status(403).json({
          status: "error",
          message:
            "You are not authorized to access these students",
        });
      }

      // Find faculty
      const faculty =
        await Faculty.findById(
          facultyId
        );

      if (!faculty) {
        return res.status(404).json({
          status: "error",
          message: "Faculty not found",
        });
      }

      // Escape faculty name for regex
      const escapedFacultyName =
        faculty.name.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      // ==================================================
      // READ FROM STUDENT VERIFICATION EXCEL RECORDS
      // ==================================================

      const verificationStudents =
        await StudentVerification.find({
          college: faculty.college,

          assignedFacultyName: {
            $regex: `^${escapedFacultyName}$`,
            $options: "i",
          },
        })
          .populate(
            "college",
            "collegeName collegeCode"
          )
          .populate(
            "student",
            "email semester phone"
          )
          .sort({ name: 1 });

      // Format data for frontend
      const students =
        verificationStudents.map(
          (verification) => ({
            _id: verification._id,

            name:
              verification.name,

            registerNumber:
              verification.registerNumber,

            department:
              verification.department,

            assignedFacultyName:
              verification.assignedFacultyName,

            college:
              verification.college,

            email:
              verification.student?.email ||
              "Not registered yet",

            semester:
              verification.student?.semester ||
              "Not available",

            phone:
              verification.student?.phone ||
              "Not available",

            registered:
              verification.registered,

            student:
              verification.student ||
              null,
          })
        );

      res.status(200).json({
        status: "success",
        students,
      });
    } catch (error) {
      console.error(
        "Get Assigned Students Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to fetch assigned students",
      });
    }
  }
);

module.exports = router;