const express = require("express");
const bcrypt = require("bcryptjs");

const College = require("../models/College");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Application = require("../models/Application");
const InternshipAssignment = require("../models/InternshipAssignment");

const router = express.Router();

// ==========================================
// COLLEGE REGISTRATION
// ==========================================

router.post("/register", async (req, res) => {
  try {
    const {
      collegeName,
      collegeCode,
      email,
      password,
      phone,
      location,
      website,
    } = req.body;

    if (
      !collegeName ||
      !collegeCode ||
      !email ||
      !password ||
      !phone ||
      !location
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please fill all required fields",
      });
    }

    const existingCollegeCode = await College.findOne({
      collegeCode,
    });

    if (existingCollegeCode) {
      return res.status(400).json({
        status: "error",
        message: "College code already registered",
      });
    }

    const existingEmail = await College.findOne({
      email,
    });

    if (existingEmail) {
      return res.status(400).json({
        status: "error",
        message: "College email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const college = new College({
      collegeName,
      collegeCode,
      email,
      password: hashedPassword,
      phone,
      location,
      website,
      status: "Pending",
    });

    await college.save();

    res.status(201).json({
      status: "success",
      message:
        "College registration submitted successfully. Waiting for admin approval.",
    });
  } catch (error) {
    console.error("College registration error:", error);

    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

// ==========================================
// COLLEGE LOGIN
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Please enter email and password",
      });
    }

    const college = await College.findOne({ email });

    if (!college) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      college.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    if (college.status !== "Approved") {
      return res.status(403).json({
        status: "error",
        message:
          "Your college account is waiting for admin approval",
      });
    }

    res.status(200).json({
      status: "success",
      message: "College login successful",
      college: {
        id: college._id,
        collegeName: college.collegeName,
        collegeCode: college.collegeCode,
        email: college.email,
        phone: college.phone,
        location: college.location,
        website: college.website,
        status: college.status,
      },
    });
  } catch (error) {
    console.error("College login error:", error);

    res.status(500).json({
      status: "error",
      message: "Login failed",
    });
  }
});

// ==========================================
// GET STUDENTS OF A COLLEGE
// ==========================================

router.get("/:collegeId/students", async (req, res) => {
  try {
    const students = await Student.find({
      college: req.params.collegeId,
    })
      .select("-password")
      .sort({ name: 1 });

    res.status(200).json({
      status: "success",
      students,
    });
  } catch (error) {
    console.error(
      "Error fetching college students:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch students",
    });
  }
});

// ==========================================
// GET FACULTY OF A COLLEGE
// ==========================================

router.get("/:collegeId/faculty", async (req, res) => {
  try {
    const faculty = await Faculty.find({
      college: req.params.collegeId,
    })
      .select("-password")
      .sort({ name: 1 });

    res.status(200).json({
      status: "success",
      faculty,
    });
  } catch (error) {
    console.error("Get College Faculty Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch faculty",
    });
  }
});

// ==========================================
// APPROVE FACULTY
// ==========================================

router.put(
  "/:collegeId/faculty/:facultyId/approve",
  async (req, res) => {
    try {
      const faculty = await Faculty.findOne({
        _id: req.params.facultyId,
        college: req.params.collegeId,
      });

      if (!faculty) {
        return res.status(404).json({
          status: "error",
          message: "Faculty not found for this college",
        });
      }

      faculty.status = "Approved";

      await faculty.save();

      res.status(200).json({
        status: "success",
        message: "Faculty approved successfully",
        faculty: {
          id: faculty._id,
          name: faculty.name,
          email: faculty.email,
          department: faculty.department,
          status: faculty.status,
        },
      });
    } catch (error) {
      console.error("Approve Faculty Error:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to approve faculty",
      });
    }
  }
);

// ==========================================
// REJECT FACULTY
// ==========================================

router.put(
  "/:collegeId/faculty/:facultyId/reject",
  async (req, res) => {
    try {
      const faculty = await Faculty.findOne({
        _id: req.params.facultyId,
        college: req.params.collegeId,
      });

      if (!faculty) {
        return res.status(404).json({
          status: "error",
          message: "Faculty not found for this college",
        });
      }

      faculty.status = "Rejected";

      await faculty.save();

      res.status(200).json({
        status: "success",
        message: "Faculty rejected successfully",
      });
    } catch (error) {
      console.error("Reject Faculty Error:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to reject faculty",
      });
    }
  }
);

// ==========================================
// GET INTERNSHIP APPLICATIONS OF COLLEGE
// ==========================================

router.get("/:collegeId/applications", async (req, res) => {
  try {
    const students = await Student.find({
      college: req.params.collegeId,
    }).select("_id");

    const studentIds = students.map(
      (student) => student._id
    );

    const applications = await Application.find({
      student: { $in: studentIds },
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
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      applications,
    });
  } catch (error) {
    console.error(
      "Get College Applications Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message:
        "Failed to fetch internship applications",
    });
  }
});

// ==========================================
// APPROVE INTERNSHIP + AUTO ASSIGN FACULTY
// ==========================================

router.put(
  "/:collegeId/applications/:applicationId/approve",
  async (req, res) => {
    try {
      const { collegeId, applicationId } = req.params;

      // ==========================================
      // FIND STUDENTS OF THIS COLLEGE
      // ==========================================

      const students = await Student.find({
        college: collegeId,
      }).select("_id");

      const studentIds = students.map(
        (student) => student._id
      );

      // ==========================================
      // FIND APPLICATION
      // ==========================================

      const application = await Application.findOne({
        _id: applicationId,
        student: { $in: studentIds },
      });

      if (!application) {
        return res.status(404).json({
          status: "error",
          message:
            "Application not found for this college",
        });
      }

      // ==========================================
      // COMPANY MUST APPROVE FIRST
      // ==========================================

      if (application.status !== "CompanyApproved") {
        return res.status(400).json({
          status: "error",
          message:
            "Only company-approved applications can be approved by college",
        });
      }

      // ==========================================
      // GET STUDENT
      // ==========================================

      const student = await Student.findById(
        application.student
      );

      if (!student) {
        return res.status(404).json({
          status: "error",
          message: "Student not found",
        });
      }

      // ==========================================
      // FIND APPROVED FACULTY
      // SAME COLLEGE + SAME DEPARTMENT
      // ==========================================

      const facultyList = await Faculty.find({
        college: collegeId,
        department: student.department,
        status: "Approved",
      }).select("-password");

      if (facultyList.length === 0) {
        return res.status(400).json({
          status: "error",
          message:
            "No approved faculty available in student's department",
        });
      }

      // ==========================================
      // FIND FACULTY WITH LOWEST WORKLOAD
      // ==========================================

      let selectedFaculty = null;
      let lowestWorkload = Infinity;

      for (const faculty of facultyList) {
        const assignedStudents =
          await Application.countDocuments({
            faculty: faculty._id,
            status: "CollegeApproved",
          });

        if (assignedStudents < lowestWorkload) {
          lowestWorkload = assignedStudents;
          selectedFaculty = faculty;
        }
      }

      if (!selectedFaculty) {
        return res.status(400).json({
          status: "error",
          message: "Unable to assign faculty",
        });
      }

      // ==========================================
      // APPROVE APPLICATION
      // ==========================================

      application.status = "CollegeApproved";
      application.faculty = selectedFaculty._id;

      await application.save();

      // ==========================================
      // CREATE / UPDATE INTERNSHIP ASSIGNMENT
      // ==========================================

      let assignment =
        await InternshipAssignment.findOne({
          student: application.student,
          internship: application.internship,
          company: application.company,
        });

      if (assignment) {
        // Existing assignment
        // Update faculty guide
        assignment.facultyGuide =
          selectedFaculty._id;

        assignment.status = "Assigned";

        await assignment.save();
      } else {
        // Create new assignment
        assignment =
          await InternshipAssignment.create({
            student: application.student,
            internship: application.internship,
            company: application.company,
            facultyGuide: selectedFaculty._id,
            status: "Assigned",
            credits: 2,
          });
      }

      // ==========================================
      // POPULATE APPLICATION
      // ==========================================

      await application.populate([
        {
          path: "student",
          select:
            "name email registerNumber department semester phone",
        },
        {
          path: "company",
          select: "companyName email location",
        },
        {
          path: "internship",
          select:
            "title description location duration eligibility skillsRequired deadline",
        },
        {
          path: "faculty",
          select:
            "name email department phone designation",
        },
      ]);

      // ==========================================
      // POPULATE ASSIGNMENT
      // ==========================================

      await assignment.populate([
        {
          path: "student",
          select:
            "name email registerNumber department semester phone",
        },
        {
          path: "company",
          select: "companyName email location",
        },
        {
          path: "internship",
          select:
            "title description location duration eligibility skillsRequired deadline",
        },
        {
          path: "facultyGuide",
          select:
            "name email department phone designation",
        },
      ]);

      // ==========================================
      // SUCCESS RESPONSE
      // ==========================================

      res.status(200).json({
        status: "success",
        message:
          "Internship approved and faculty assigned successfully",

        application,

        assignment,

        assignedFaculty: {
          id: selectedFaculty._id,
          name: selectedFaculty.name,
          department: selectedFaculty.department,
          currentWorkload: lowestWorkload + 1,
        },
      });
    } catch (error) {
      console.error(
        "Approve Internship Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to approve internship",
        error: error.message,
      });
    }
  }
);

// ==========================================
// REJECT INTERNSHIP
// ==========================================

router.put(
  "/:collegeId/applications/:applicationId/reject",
  async (req, res) => {
    try {
      const { collegeId, applicationId } = req.params;

      // ==========================================
      // FIND STUDENTS OF COLLEGE
      // ==========================================

      const students = await Student.find({
        college: collegeId,
      }).select("_id");

      const studentIds = students.map(
        (student) => student._id
      );

      // ==========================================
      // FIND APPLICATION
      // ==========================================

      const application = await Application.findOne({
        _id: applicationId,
        student: { $in: studentIds },
      });

      if (!application) {
        return res.status(404).json({
          status: "error",
          message:
            "Application not found for this college",
        });
      }

      // ==========================================
      // COMPANY MUST APPROVE FIRST
      // ==========================================

      if (application.status !== "CompanyApproved") {
        return res.status(400).json({
          status: "error",
          message:
            "Only company-approved applications can be rejected by college",
        });
      }

      // ==========================================
      // REJECT APPLICATION
      // ==========================================

      application.status = "CollegeRejected";
      application.faculty = null;

      await application.save();

      res.status(200).json({
        status: "success",
        message: "Internship rejected by college",
      });
    } catch (error) {
      console.error(
        "Reject Internship Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to reject internship",
        error: error.message,
      });
    }
  }
);

module.exports = router;