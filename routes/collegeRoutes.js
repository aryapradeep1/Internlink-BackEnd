const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const XLSX = require("xlsx");
const mongoose = require("mongoose");

const College = require("../models/College");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Application = require("../models/Application");
const InternshipAssignment = require("../models/InternshipAssignment");
const StudentVerification = require("../models/StudentVerification");
const FacultyVerification = require("../models/FacultyVerification");

const router = express.Router();

// ==========================================
// EXCEL UPLOAD CONFIGURATION
// ==========================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// ==========================================
// HELPER - NORMALIZE EXCEL HEADER
// ==========================================

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");
}

// ==========================================
// HELPER - GET EXCEL CELL VALUE
// ==========================================

function getCell(row, possibleNames) {
  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);

    for (const key of Object.keys(row)) {
      if (normalizeHeader(key) === normalizedName) {
        return String(row[key] ?? "").trim();
      }
    }
  }

  return "";
}

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
// GET COLLEGE PROFILE
// ==========================================

router.get("/profile/:id", async (req, res) => {
  try {
    const college = await College.findById(
      req.params.id
    ).select("-password");

    if (!college) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    res.status(200).json({
      status: "success",
      college,
    });
  } catch (error) {
    console.error("Get College Profile Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to load college profile",
    });
  }
});

// ==========================================
// UPDATE COLLEGE PROFILE
// ==========================================

router.put("/profile/:id", async (req, res) => {
  try {
    const {
      collegeName,
      email,
      phone,
      location,
      website,
    } = req.body;

    if (
      !collegeName ||
      !email ||
      !phone ||
      !location
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please fill all required fields",
      });
    }

    const college = await College.findById(req.params.id);

    if (!college) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    const existingEmail = await College.findOne({
      email,
      _id: { $ne: req.params.id },
    });

    if (existingEmail) {
      return res.status(400).json({
        status: "error",
        message: "College email already registered",
      });
    }

    college.collegeName = collegeName;
    college.email = email;
    college.phone = phone;
    college.location = location;
    college.website = website;

    await college.save();

    res.status(200).json({
      status: "success",
      message: "College profile updated successfully",
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
    console.error("Update College Profile Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to update college profile",
    });
  }
});

// ==========================================
// CHANGE COLLEGE PASSWORD
// ==========================================

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
        message:
          "New password must be at least 6 characters",
      });
    }

    const college = await College.findById(req.params.id);

    if (!college) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      college.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "error",
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    college.password = hashedPassword;

    await college.save();

    res.status(200).json({
      status: "success",
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change College Password Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to change password",
    });
  }
});

// ======================================================
// UPLOAD STUDENT EXCEL VERIFICATION FILE
// ======================================================

router.post(
  "/:collegeId/upload-student-excel",
  upload.single("file"),
  async (req, res) => {
    try {
      const { collegeId } = req.params;

      if (!mongoose.isValidObjectId(collegeId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid college ID",
        });
      }

      const college = await College.findById(collegeId);

      if (!college) {
        return res.status(404).json({
          status: "error",
          message: "College not found",
        });
      }

      if (college.status !== "Approved") {
        return res.status(403).json({
          status: "error",
          message:
            "Only approved colleges can upload student Excel files",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "Please upload an Excel file",
        });
      }

      const fileName =
        req.file.originalname.toLowerCase();

      if (
        !fileName.endsWith(".xlsx") &&
        !fileName.endsWith(".xls")
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Only .xlsx and .xls Excel files are allowed",
        });
      }

      const workbook = XLSX.read(req.file.buffer, {
        type: "buffer",
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        return res.status(400).json({
          status: "error",
          message:
            "Excel file does not contain a worksheet",
        });
      }

      const worksheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(
        worksheet,
        {
          defval: "",
        }
      );

      if (rows.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Excel file is empty",
        });
      }

      const requiredColumns = [
        "Name",
        "College",
        "Register Number",
        "Department",
        "Assigned Faculty Name",
        "Verification Code",
      ];

      const firstRowKeys = Object.keys(rows[0]);

      const normalizedHeaders =
        firstRowKeys.map((header) =>
          normalizeHeader(header)
        );

      const missingColumns =
        requiredColumns.filter(
          (requiredColumn) =>
            !normalizedHeaders.includes(
              normalizeHeader(requiredColumn)
            )
        );

      if (missingColumns.length > 0) {
        return res.status(400).json({
          status: "error",
          message:
            "Excel file is missing required columns",
          missingColumns,
        });
      }

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      const errors = [];

      for (
        let i = 0;
        i < rows.length;
        i++
      ) {
        const row = rows[i];

        const excelRowNumber = i + 2;

        const name = getCell(row, ["Name"]);

        const collegeName = getCell(row, [
          "College",
          "College Name",
        ]);

        const registerNumber = getCell(row, [
          "Register Number",
          "RegisterNumber",
          "Registration Number",
        ]);

        const department = getCell(row, [
          "Department",
        ]);

        const assignedFacultyName =
          getCell(row, [
            "Assigned Faculty Name",
            "AssignedFacultyName",
            "Faculty Name",
          ]);

        const verificationCode =
          getCell(row, [
            "Verification Code",
            "VerificationCode",
            "Verification",
          ]);

        if (
          !name ||
          !collegeName ||
          !registerNumber ||
          !department ||
          !assignedFacultyName ||
          !verificationCode
        ) {
          errors.push({
            row: excelRowNumber,
            message:
              "One or more required fields are empty",
          });

          skipped++;
          continue;
        }

        if (
          collegeName.trim().toLowerCase() !==
          college.collegeName
            .trim()
            .toLowerCase()
        ) {
          errors.push({
            row: excelRowNumber,
            message:
              `College name "${collegeName}" does not match the uploading college`,
          });

          skipped++;
          continue;
        }
const existingStudent =
  await Student.findOne({
    registerNumber,
  });

const existingVerification =
  await StudentVerification.findOne({
    college: collegeId,
    registerNumber,
  });

        try {
          if (existingVerification) {
            existingVerification.name = name;

            existingVerification.collegeName =
              collegeName;

            existingVerification.department =
              department;

            existingVerification.assignedFacultyName =
              assignedFacultyName;

            existingVerification.verificationCode =
              verificationCode;

            await existingVerification.save();

            updated++;
          } else {
            await StudentVerification.create({
              name,
              collegeName,
              college: collegeId,
              registerNumber,
              department,
              assignedFacultyName,
              verificationCode,
              registered: false,
              student: null,
            });

            imported++;
          }
        } catch (error) {
          console.error(
            `Error processing Excel row ${excelRowNumber}:`,
            error
          );

          errors.push({
            row: excelRowNumber,
            message:
              "Failed to save this student record",
          });

          skipped++;
        }
      }

      res.status(200).json({
        status: "success",
        message:
          "Student Excel file processed successfully",
        summary: {
          totalRows: rows.length,
          imported,
          updated,
          skipped,
        },
        errors,
      });
    } catch (error) {
      console.error(
        "Student Excel Upload Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to process student Excel file",
        error: error.message,
      });
    }
  }
);

// ======================================================
// UPLOAD FACULTY EXCEL VERIFICATION FILE
// ======================================================
//
// Excel columns:
//
// Name
// College
// Department
// Verification Code
//
// ======================================================

router.post(
  "/:collegeId/upload-faculty-excel",
  upload.single("file"),
  async (req, res) => {
    try {
      const { collegeId } = req.params;

      if (!mongoose.isValidObjectId(collegeId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid college ID",
        });
      }

      const college =
        await College.findById(collegeId);

      if (!college) {
        return res.status(404).json({
          status: "error",
          message: "College not found",
        });
      }

      if (college.status !== "Approved") {
        return res.status(403).json({
          status: "error",
          message:
            "Only approved colleges can upload faculty Excel files",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "Please upload an Excel file",
        });
      }

      const fileName =
        req.file.originalname.toLowerCase();

      if (
        !fileName.endsWith(".xlsx") &&
        !fileName.endsWith(".xls")
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Only .xlsx and .xls Excel files are allowed",
        });
      }

      const workbook = XLSX.read(
        req.file.buffer,
        {
          type: "buffer",
        }
      );

      const sheetName =
        workbook.SheetNames[0];

      if (!sheetName) {
        return res.status(400).json({
          status: "error",
          message:
            "Excel file does not contain a worksheet",
        });
      }

      const worksheet =
        workbook.Sheets[sheetName];

      const rows =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            defval: "",
          }
        );

      if (rows.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Excel file is empty",
        });
      }

      const requiredColumns = [
        "Name",
        "College",
        "Department",
        "Verification Code",
      ];

      const firstRowKeys =
        Object.keys(rows[0]);

      const normalizedHeaders =
        firstRowKeys.map(
          (header) =>
            normalizeHeader(header)
        );

      const missingColumns =
        requiredColumns.filter(
          (requiredColumn) =>
            !normalizedHeaders.includes(
              normalizeHeader(
                requiredColumn
              )
            )
        );

      if (missingColumns.length > 0) {
        return res.status(400).json({
          status: "error",
          message:
            "Excel file is missing required columns",
          missingColumns,
        });
      }

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      const errors = [];

      for (
        let i = 0;
        i < rows.length;
        i++
      ) {
        const row = rows[i];

        const excelRowNumber = i + 2;

        const name = getCell(
          row,
          ["Name"]
        );

        const collegeName =
          getCell(
            row,
            [
              "College",
              "College Name",
            ]
          );

        const department =
          getCell(
            row,
            ["Department"]
          );

        const verificationCode =
          getCell(
            row,
            [
              "Verification Code",
              "VerificationCode",
              "Verification",
            ]
          );

        if (
          !name ||
          !collegeName ||
          !department ||
          !verificationCode
        ) {
          errors.push({
            row: excelRowNumber,
            message:
              "One or more required fields are empty",
          });

          skipped++;
          continue;
        }

        if (
          collegeName
            .trim()
            .toLowerCase() !==
          college.collegeName
            .trim()
            .toLowerCase()
        ) {
          errors.push({
            row: excelRowNumber,
            message:
              `College name "${collegeName}" does not match the uploading college`,
          });

          skipped++;
          continue;
        }

        const existingFaculty =
          await Faculty.findOne({
            college: collegeId,
            name: name.trim(),
            department: department.trim(),
          });

        if (existingFaculty) {
          errors.push({
            row: excelRowNumber,
            message:
              `Faculty "${name}" is already registered`,
          });

          skipped++;
          continue;
        }

        const existingVerification =
          await FacultyVerification.findOne({
            college: collegeId,
            name: name.trim(),
            department: department.trim(),
          });

        try {
          if (existingVerification) {
            existingVerification.name =
              name.trim();

            existingVerification.collegeName =
              collegeName.trim();

            existingVerification.department =
              department.trim();

            existingVerification.verificationCode =
              verificationCode.trim();

            await existingVerification.save();

            updated++;
          } else {
            await FacultyVerification.create({
              name: name.trim(),
              collegeName:
                collegeName.trim(),
              college: collegeId,
              department:
                department.trim(),
              verificationCode:
                verificationCode.trim(),
              registered: false,
              faculty: null,
            });

            imported++;
          }
        } catch (error) {
          console.error(
            `Error processing faculty Excel row ${excelRowNumber}:`,
            error
          );

          errors.push({
            row: excelRowNumber,
            message:
              "Failed to save this faculty record",
          });

          skipped++;
        }
      }

      res.status(200).json({
        status: "success",
        message:
          "Faculty Excel file processed successfully",
        summary: {
          totalRows: rows.length,
          imported,
          updated,
          skipped,
        },
        errors,
      });
    } catch (error) {
      console.error(
        "Faculty Excel Upload Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to process faculty Excel file",
        error: error.message,
      });
    }
  }
);

// ==========================================
// GET STUDENTS OF A COLLEGE
// ==========================================

router.get(
  "/:collegeId/students",
  async (req, res) => {
    try {
      const students =
        await Student.find({
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
        message:
          "Failed to fetch students",
      });
    }
  }
);

// ==========================================
// GET FACULTY OF A COLLEGE
// ==========================================

router.get(
  "/:collegeId/faculty",
  async (req, res) => {
    try {
      const faculty =
        await Faculty.find({
          college: req.params.collegeId,
        })
          .select("-password")
          .sort({ name: 1 });

      res.status(200).json({
        status: "success",
        faculty,
      });
    } catch (error) {
      console.error(
        "Get College Faculty Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to fetch faculty",
      });
    }
  }
);

// ==========================================
// APPROVE FACULTY
// ==========================================

router.put(
  "/:collegeId/faculty/:facultyId/approve",
  async (req, res) => {
    try {
      const faculty =
        await Faculty.findOne({
          _id: req.params.facultyId,
          college: req.params.collegeId,
        });

      if (!faculty) {
        return res.status(404).json({
          status: "error",
          message:
            "Faculty not found for this college",
        });
      }

      faculty.status = "Approved";

      await faculty.save();

      res.status(200).json({
        status: "success",
        message:
          "Faculty approved successfully",
        faculty: {
          id: faculty._id,
          name: faculty.name,
          email: faculty.email,
          department:
            faculty.department,
          status: faculty.status,
        },
      });
    } catch (error) {
      console.error(
        "Approve Faculty Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to approve faculty",
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
      const faculty =
        await Faculty.findOne({
          _id: req.params.facultyId,
          college: req.params.collegeId,
        });

      if (!faculty) {
        return res.status(404).json({
          status: "error",
          message:
            "Faculty not found for this college",
        });
      }

      faculty.status = "Rejected";

      await faculty.save();

      res.status(200).json({
        status: "success",
        message:
          "Faculty rejected successfully",
      });
    } catch (error) {
      console.error(
        "Reject Faculty Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to reject faculty",
      });
    }
  }
);

// ==========================================
// GET INTERNSHIP APPLICATIONS OF COLLEGE
// ==========================================

router.get(
  "/:collegeId/applications",
  async (req, res) => {
    try {
      const students =
        await Student.find({
          college: req.params.collegeId,
        }).select("_id");

      const studentIds =
        students.map(
          (student) => student._id
        );

      const applications =
        await Application.find({
          student: {
            $in: studentIds,
          },
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
          .sort({
            createdAt: -1,
          });

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
  }
);

// ==========================================
// APPROVE INTERNSHIP
// USE PRE-ASSIGNED FACULTY FROM EXCEL
// ==========================================

router.put(
  "/:collegeId/applications/:applicationId/approve",
  async (req, res) => {
    try {
      const {
        collegeId,
        applicationId,
      } = req.params;

      // ------------------------------------------
      // Find students belonging to this college
      // ------------------------------------------

      const students =
        await Student.find({
          college: collegeId,
        }).select("_id");

      const studentIds =
        students.map(
          (student) => student._id
        );

      // ------------------------------------------
      // Find application
      // ------------------------------------------

      const application =
        await Application.findOne({
          _id: applicationId,
          student: {
            $in: studentIds,
          },
        });

      if (!application) {
        return res.status(404).json({
          status: "error",
          message:
            "Application not found for this college",
        });
      }

      // ------------------------------------------
      // Only company-approved applications
      // can be approved by college
      // ------------------------------------------

      if (
        application.status !==
        "CompanyApproved"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Only company-approved applications can be approved by college",
        });
      }

      // ------------------------------------------
      // Find student
      // ------------------------------------------

      const student =
        await Student.findById(
          application.student
        );

      if (!student) {
        return res.status(404).json({
          status: "error",
          message:
            "Student not found",
        });
      }

      // ------------------------------------------
      // Find student's Excel verification record
      // ------------------------------------------

      const studentVerification =
        await StudentVerification.findOne({
          college: collegeId,
          registerNumber:
            student.registerNumber,
        });

      if (!studentVerification) {
        return res.status(400).json({
          status: "error",
          message:
            "Student verification record not found. Faculty assignment cannot be determined.",
        });
      }

      // ------------------------------------------
      // Get faculty assigned in Excel
      // ------------------------------------------

      const assignedFacultyName =
        studentVerification.assignedFacultyName?.trim();

      if (!assignedFacultyName) {
        return res.status(400).json({
          status: "error",
          message:
            "No faculty is assigned to this student in the college Excel record.",
        });
      }

      // ------------------------------------------
      // Escape faculty name for regex
      // ------------------------------------------

      const escapedFacultyName =
        assignedFacultyName.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      // ------------------------------------------
      // Find EXACT assigned faculty
      // ------------------------------------------

      const selectedFaculty =
        await Faculty.findOne({
          college: collegeId,
          department:
            student.department,
          name: {
            $regex: `^${escapedFacultyName}$`,
            $options: "i",
          },
          status: "Approved",
        }).select("-password");

      if (!selectedFaculty) {
        return res.status(400).json({
          status: "error",
          message:
            `The assigned faculty "${assignedFacultyName}" is not registered or approved for this student's college and department.`,
        });
      }

      // ------------------------------------------
      // Approve application
      // ------------------------------------------

      application.status =
        "CollegeApproved";

      application.faculty =
        selectedFaculty._id;

      await application.save();

      // ------------------------------------------
      // Create or update internship assignment
      // ------------------------------------------

      let assignment =
        await InternshipAssignment.findOne({
          student:
            application.student,
          internship:
            application.internship,
          company:
            application.company,
        });

      if (assignment) {
        assignment.facultyGuide =
          selectedFaculty._id;

        assignment.status =
          "Assigned";

        await assignment.save();
      } else {
        assignment =
          await InternshipAssignment.create({
            student:
              application.student,
            internship:
              application.internship,
            company:
              application.company,
            facultyGuide:
              selectedFaculty._id,
            status:
              "Assigned",
            credits: 2,
          });
      }

      // ------------------------------------------
      // Populate application
      // ------------------------------------------

      await application.populate([
        {
          path: "student",
          select:
            "name email registerNumber department semester phone",
        },
        {
          path: "company",
          select:
            "companyName email location",
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

      // ------------------------------------------
      // Populate assignment
      // ------------------------------------------

      await assignment.populate([
        {
          path: "student",
          select:
            "name email registerNumber department semester phone",
        },
        {
          path: "company",
          select:
            "companyName email location",
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

      // ------------------------------------------
      // Response
      // ------------------------------------------

      res.status(200).json({
        status: "success",
        message:
          "Internship approved and the student's pre-assigned faculty guide has been assigned successfully",
        application,
        assignment,
        assignedFaculty: {
          id: selectedFaculty._id,
          name: selectedFaculty.name,
          department:
            selectedFaculty.department,
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
      const {
        collegeId,
        applicationId,
      } = req.params;

      const students =
        await Student.find({
          college: collegeId,
        }).select("_id");

      const studentIds =
        students.map(
          (student) => student._id
        );

      const application =
        await Application.findOne({
          _id: applicationId,
          student: {
            $in: studentIds,
          },
        });

      if (!application) {
        return res.status(404).json({
          status: "error",
          message:
            "Application not found for this college",
        });
      }

      if (
        application.status !==
        "CompanyApproved"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Only company-approved applications can be rejected by college",
        });
      }

      application.status =
        "CollegeRejected";

      application.faculty = null;

      await application.save();

      res.status(200).json({
        status: "success",
        message:
          "Internship rejected by college",
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