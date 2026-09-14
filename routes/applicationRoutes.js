const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Application = require("../models/Application");
const Student = require("../models/Student");
const Company = require("../models/Company");
const Internship = require("../models/Internship");
const InternshipAssignment = require("../models/InternshipAssignment");
// =====================================================
// UPLOAD FOLDERS
// =====================================================

const uploadsFolder = path.join(__dirname, "..", "uploads");

const tempFolder = path.join(uploadsFolder, "temp");
const resumeFolder = path.join(uploadsFolder, "resumes");
const markListFolder = path.join(uploadsFolder, "marklists");

// Make sure folders exist
[tempFolder, resumeFolder, markListFolder].forEach(
  (folder) => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }
);

// =====================================================
// MULTER CONFIGURATION
// =====================================================

// First save files temporarily
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempFolder);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
});

// =====================================================
// SUBMIT INTERNSHIP APPLICATION
// =====================================================

router.post(
  "/apply",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "markList", maxCount: 1 },
  ]),
  async (req, res) => {
    let resumeTempPath = null;
    let markListTempPath = null;

    try {
      const {
        student,
        company,
        internship,
        position,
      } = req.body;

      const resume = req.files?.resume?.[0];
      const markList = req.files?.markList?.[0];

      // =====================================================
      // CHECK REQUIRED FIELDS
      // =====================================================

      if (
        !student ||
        !company ||
        !internship ||
        !position ||
        !resume ||
        !markList
      ) {
        // Delete temporary files if they were uploaded
        if (resume) {
          fs.unlinkSync(resume.path);
        }

        if (markList) {
          fs.unlinkSync(markList.path);
        }

        return res.status(400).json({
          status: "error",
          message:
            "Please provide all required fields and documents",
        });
      }

      // Save temporary paths
      resumeTempPath = resume.path;
      markListTempPath = markList.path;

      // =====================================================
      // CHECK STUDENT
      // =====================================================

      const studentExists = await Student.findById(student);

      if (!studentExists) {
        throw new Error("Student not found");
      }

      // =====================================================
      // CHECK COMPANY
      // =====================================================

      const companyExists = await Company.findById(company);

      if (!companyExists) {
        throw new Error("Company not found");
      }

      // =====================================================
      // CHECK INTERNSHIP
      // =====================================================

      const internshipExists = await Internship.findOne({
        _id: internship,
        company: company,
      });

      if (!internshipExists) {
        throw new Error(
          "Internship not found for this company"
        );
      }

      // =====================================================
      // CHECK DUPLICATE APPLICATION
      // =====================================================

      const existingApplication =
        await Application.findOne({
          student: student,
          internship: internship,
        });

      if (existingApplication) {
        throw new Error(
          "You have already applied to this internship"
        );
      }

      // =====================================================
      // CREATE APPLICATION
      // =====================================================

      const application = new Application({
        student,
        company,
        internship,
        position,

        // Temporary paths for now
        resume: resumeTempPath,
        markList: markListTempPath,

        status: "Pending",
      });

      await application.save();

      // =====================================================
      // MOVE FILES TO PERMANENT FOLDERS
      // =====================================================

      const resumeFileName =
        path.basename(resumeTempPath);

      const markListFileName =
        path.basename(markListTempPath);

      const finalResumePath = path.join(
        resumeFolder,
        resumeFileName
      );

      const finalMarkListPath = path.join(
        markListFolder,
        markListFileName
      );

      fs.renameSync(
        resumeTempPath,
        finalResumePath
      );

      fs.renameSync(
        markListTempPath,
        finalMarkListPath
      );

      // =====================================================
      // UPDATE APPLICATION WITH FINAL FILE PATHS
      // =====================================================

      application.resume =
        `uploads/resumes/${resumeFileName}`;

      application.markList =
        `uploads/marklists/${markListFileName}`;

      await application.save();

      // =====================================================
      // SUCCESS
      // =====================================================

      res.status(201).json({
        status: "success",
        message:
          "Internship application submitted successfully",
        application,
      });
    } catch (error) {
      console.error(
        "Application Error:",
        error
      );

      // =====================================================
      // DELETE TEMPORARY FILES IF SOMETHING FAILED
      // =====================================================

      try {
        if (
          resumeTempPath &&
          fs.existsSync(resumeTempPath)
        ) {
          fs.unlinkSync(resumeTempPath);
        }

        if (
          markListTempPath &&
          fs.existsSync(markListTempPath)
        ) {
          fs.unlinkSync(markListTempPath);
        }
      } catch (cleanupError) {
        console.error(
          "Temporary file cleanup error:",
          cleanupError
        );
      }

      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  }
);

// =====================================================
// GET ALL APPLICATIONS FOR A COMPANY
// =====================================================

router.get("/company/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;

    const companyExists =
      await Company.findById(companyId);

    if (!companyExists) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    const applications =
      await Application.find({
        company: companyId,
      })
        .populate(
          "student",
          "name email registerNumber department semester phone"
        )
        .populate(
          "internship",
          "title description location duration eligibility skillsRequired deadline"
        )
        .sort({ createdAt: -1 });

    // =====================================================
    // ADD INTERNSHIP ASSIGNMENT DETAILS
    // =====================================================

    const applicationsWithAssignments =
      await Promise.all(
        applications.map(async (application) => {
          const assignment =
            await InternshipAssignment.findOne({
              student: application.student?._id,
              internship: application.internship?._id,
              company: companyId,
            })
              .populate(
                "companyGuide",
                "name email employeeId"
              )
              .populate(
                "facultyGuide",
                "name email department"
              );

          return {
            ...application.toObject(),

            assignmentId:
              assignment?._id || null,

            companyGuide:
              assignment?.companyGuide || null,

            facultyGuide:
              assignment?.facultyGuide || null,
          };
        })
      );

    res.status(200).json({
      status: "success",
      applications:
        applicationsWithAssignments,
    });
  } catch (error) {
    console.error(
      "Fetch Company Applications Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message:
        "Failed to fetch company applications",
      error: error.message,
    });
  }
});

// =====================================================
// GET ALL APPLICATIONS FOR A COMPANY
// =====================================================

router.get("/company/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;

    const companyExists =
      await Company.findById(companyId);

    if (!companyExists) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    const applications =
      await Application.find({
        company: companyId,
      })
        .populate(
          "student",
          "name email registerNumber department semester phone"
        )
        .populate(
          "internship",
          "title description location duration eligibility skillsRequired deadline"
        )
        .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      applications,
    });
  } catch (error) {
    console.error(
      "Fetch Company Applications Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch company applications",
      error: error.message,
    });
  }
});

// =====================================================
// COMPANY APPROVE OR REJECT APPLICATION
// =====================================================

router.put(
  "/status/:applicationId",
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { status } = req.body;

      if (
        status !== "CompanyApproved" &&
        status !== "CompanyRejected"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Status must be CompanyApproved or CompanyRejected",
        });
      }

      const application =
        await Application.findById(
          applicationId
        );

      if (!application) {
        return res.status(404).json({
          status: "error",
          message: "Application not found",
        });
      }

      if (application.status !== "Pending") {
        return res.status(400).json({
          status: "error",
          message:
            "This application has already been processed",
        });
      }

      application.status = status;

      await application.save();

      res.status(200).json({
        status: "success",
        message:
          status === "CompanyApproved"
            ? "Application accepted by company. Waiting for college verification."
            : "Application rejected by company.",
        application,
      });
    } catch (error) {
      console.error(
        "Update Application Status Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to update application status",
        error: error.message,
      });
    }
  }
);

// =====================================================
// TEMPORARY UPDATE APPLICATION COMPANY
// =====================================================

router.put(
  "/company/:applicationId",
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { companyId } = req.body;

      const application =
        await Application.findById(
          applicationId
        );

      if (!application) {
        return res.status(404).json({
          status: "error",
          message: "Application not found",
        });
      }

      const companyExists =
        await Company.findById(companyId);

      if (!companyExists) {
        return res.status(404).json({
          status: "error",
          message: "New company not found",
        });
      }

      application.company = companyId;

      await application.save();

      res.status(200).json({
        status: "success",
        message:
          "Application company updated successfully",
        application,
      });
    } catch (error) {
      console.error(
        "Update Application Company Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to update application company",
        error: error.message,
      });
    }
  }
);

module.exports = router;