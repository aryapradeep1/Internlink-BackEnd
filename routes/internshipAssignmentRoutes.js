const express = require("express");
const router = express.Router();

const InternshipAssignment = require("../models/InternshipAssignment");
const Application = require("../models/Application");
const Logbook = require("../models/Logbook");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// =====================================================
// CERTIFICATE UPLOAD
// =====================================================

const certificateDir = path.join(
  __dirname,
  "../uploads/certificates"
);

if (!fs.existsSync(certificateDir)) {
  fs.mkdirSync(certificateDir, {
    recursive: true,
  });
}

const certificateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, certificateDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const uploadCertificate = multer({
  storage: certificateStorage,

  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(
        new Error("Certificate must be a PDF file.")
      );
    }
  },
});



router.post("/assign", async (req, res) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        status: "error",
        message: "Application ID is required",
      });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        status: "error",
        message: "Application not found",
      });
    }

    // Support both current and older records
    const allowedStatuses = ["CompanyApproved", "CollegeApproved", "Approved"];

    if (!allowedStatuses.includes(application.status)) {
      return res.status(400).json({
        status: "error",
        message:
          "Only approved applications can be assigned. Current status: " +
          application.status,
      });
    }

    // Prevent two active/assigned internships for one student
    const existingAssignment = await InternshipAssignment.findOne({
      student: application.student,
      status: { $in: ["Assigned", "Active"] },
    });

    if (existingAssignment) {
      return res.status(400).json({
        status: "error",
        message: "This student already has an assigned or active internship",
        assignmentId: existingAssignment._id,
      });
    }

    // Prevent assigning the same application twice
    const sameApplicationAssignment = await InternshipAssignment.findOne({
      student: application.student,
      internship: application.internship,
      company: application.company,
    });

    if (sameApplicationAssignment) {
      return res.status(400).json({
        status: "error",
        message: "This internship has already been assigned to the student",
        assignment: sameApplicationAssignment,
      });
    }

    const assignment = await InternshipAssignment.create({
      student: application.student,
      internship: application.internship,
      company: application.company,
      facultyGuide: null,
      status: "Assigned",
      credits: 0,
    });

    // Final college decision is recorded after assignment
    application.status = "CollegeApproved";
    await application.save();

    res.status(201).json({
      status: "success",
      message: "Internship assigned successfully",
      assignment,
      application,
    });
  } catch (error) {
    console.error("Assign Internship Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to assign internship",
      error: error.message,
    });
  }
});

// =====================================================
// GET INTERNSHIP ASSIGNMENT FOR A STUDENT
// =====================================================

router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const assignment = await InternshipAssignment.findOne({
      student: studentId,
      status: {
        $in: ["Assigned", "Active", "Completed"],
      },
    })
      .populate(
        "student",
        "name email registerNumber department semester phone"
      )
      .populate(
        "internship",
        "title description location duration eligibility skillsRequired deadline"
      )
      .populate(
        "company",
        "companyName email location"
      )
      .populate(
        "facultyGuide",
        "name email department phone designation"
      )
      .populate(
        "companyGuide",
        "name email employeeId"
      );

    if (!assignment) {
      return res.status(404).json({
        status: "error",
        message:
          "No internship assigned to this student",
      });
    }

    res.status(200).json({
      status: "success",
      assignment,
    });

  } catch (error) {
    console.error(
      "Fetch Student Internship Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch internship",
      error: error.message,
    });
  }
});


router.get("/faculty/:facultyId", async (req, res) => {
  try {
    const { facultyId } = req.params;

    const assignments = await InternshipAssignment.find({
      facultyGuide: facultyId,
      status: { $in: ["Assigned", "Active", "Completed"] },
    })
      .populate(
        "student",
        "name email registerNumber department semester phone"
      )
      .populate(
        "internship",
        "title description location duration eligibility skillsRequired deadline"
      )
      .populate(
        "company",
        "companyName email location"
      );

    res.status(200).json({
      status: "success",
      assignments,
    });
  } catch (error) {
    console.error("Fetch Faculty Students Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch assigned students",
      error: error.message,
    });
  }
});

// Assign Company Guide to Internship
router.put("/company-guide/:assignmentId", async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { companyGuideId } = req.body;

    if (!companyGuideId) {
      return res.status(400).json({
        status: "error",
        message: "Company Guide ID is required",
      });
    }

    const assignment = await InternshipAssignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({
        status: "error",
        message: "Internship assignment not found",
      });
    }

    const CompanyGuide = require("../models/CompanyGuide");

    const guide = await CompanyGuide.findById(companyGuideId);

    if (!guide) {
      return res.status(404).json({
        status: "error",
        message: "Company Guide not found",
      });
    }

    if (guide.status !== "Approved") {
      return res.status(400).json({
        status: "error",
        message: "Company Guide is not approved",
      });
    }

    // Make sure the guide belongs to the same company
    if (guide.company.toString() !== assignment.company.toString()) {
      return res.status(400).json({
        status: "error",
        message: "This Company Guide does not belong to the internship company",
      });
    }

    assignment.companyGuide = guide._id;

    await assignment.save();

    const updatedAssignment = await InternshipAssignment.findById(
      assignment._id
    )
      .populate("student", "name email registerNumber department semester")
      .populate("internship", "title duration location")
      .populate("company", "companyName email location")
      .populate("facultyGuide", "name email department")
      .populate("companyGuide", "name email employeeId");

    res.status(200).json({
      status: "success",
      message: "Company Guide assigned successfully",
      assignment: updatedAssignment,
    });
  } catch (error) {
    console.error("Assign Company Guide Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to assign Company Guide",
      error: error.message,
    });
  }
});

// =====================================================
// GET INTERNSHIPS ASSIGNED TO A COMPANY GUIDE
// =====================================================

router.get("/company-guide/:companyGuideId", async (req, res) => {
  try {
    const { companyGuideId } = req.params;

    const assignments = await InternshipAssignment.find({
      companyGuide: companyGuideId,
      status: { $in: ["Assigned", "Active", "Completed"] },
    })
      .populate(
        "student",
        "name email registerNumber department semester phone"
      )
      .populate(
        "internship",
        "title description location duration eligibility skillsRequired deadline"
      )
      .populate(
        "company",
        "companyName email location"
      )
      .populate(
        "facultyGuide",
        "name email department phone designation"
      )
      .populate(
        "companyGuide",
        "name email employeeId"
      );

    res.status(200).json({
      status: "success",
      assignments,
    });
  } catch (error) {
    console.error(
      "Fetch Company Guide Assignments Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message:
        "Failed to fetch assigned internships",
      error: error.message,
    });
  }
});


// =====================================================
// FACULTY - GIVE INTERNSHIP MARK
// =====================================================

router.put("/faculty/mark/:assignmentId", async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { facultyId, mark } = req.body;

    if (!facultyId) {
      return res.status(400).json({
        status: "error",
        message: "Faculty ID is required",
      });
    }

    if (mark === undefined || mark === null || mark === "") {
      return res.status(400).json({
        status: "error",
        message: "Mark is required",
      });
    }

    const numericMark = Number(mark);

    if (isNaN(numericMark) || numericMark < 0 || numericMark > 100) {
      return res.status(400).json({
        status: "error",
        message: "Mark must be between 0 and 100",
      });
    }

    // Make sure this assignment belongs to this Faculty Guide
    const assignment = await InternshipAssignment.findOne({
      _id: assignmentId,
      facultyGuide: facultyId,
    });

    if (!assignment) {
      return res.status(404).json({
        status: "error",
        message: "Assignment not found for this Faculty Guide",
      });
    }

    // Calculate total worked hours
    const logbooks = await Logbook.find({
      student: assignment.student,
      internship: assignment.internship,
    });

    const totalHours = logbooks.reduce(
      (total, logbook) =>
        total + Number(logbook.hoursWorked || 0),
      0
    );

    // Credits are given only when hours are greater than 60
if (assignment.status !== "Completed") {
  return res.status(400).json({
    status: "error",
    message:
      "Faculty can give the mark only after the internship is completed",
  });
}


assignment.mark = numericMark;
assignment.credits = 2;


await assignment.save();

    res.status(200).json({
      status: "success",
      message: "Mark saved successfully",
      assignment,
      totalHours,
    });
  } catch (error) {
    console.error("Faculty Mark Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to save mark",
      error: error.message,
    });
  }
});

// =====================================================
// COMPANY - UPLOAD INTERNSHIP CERTIFICATE
// =====================================================

router.put(
  "/certificate/:assignmentId",
  uploadCertificate.single("certificate"),
  async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const { companyId } = req.body;

      if (!companyId) {
        return res.status(400).json({
          status: "error",
          message: "Company ID is required",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "Please upload the certificate PDF",
        });
      }

      const assignment =
        await InternshipAssignment.findById(
          assignmentId
        );

      if (!assignment) {
        return res.status(404).json({
          status: "error",
          message: "Internship assignment not found",
        });
      }

      // Make sure this internship belongs to the company
      if (
        assignment.company.toString() !==
        companyId.toString()
      ) {
        return res.status(403).json({
          status: "error",
          message:
            "You cannot upload a certificate for another company's internship",
        });
      }

      // Certificate can be uploaded only after completion
      if (assignment.status !== "Completed") {
        return res.status(400).json({
          status: "error",
          message:
            "Certificate can be uploaded only after the internship is completed",
        });
      }

      assignment.certificate =
        `uploads/certificates/${req.file.filename}`;

      await assignment.save();

      res.status(200).json({
        status: "success",
        message:
          "Internship certificate uploaded successfully",
        certificate: assignment.certificate,
      });
    } catch (error) {
      console.error(
        "Certificate Upload Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          error.message ||
          "Failed to upload certificate",
      });
    }
  }
);

module.exports = router;