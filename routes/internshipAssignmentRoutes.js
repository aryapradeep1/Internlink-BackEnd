const express = require("express");
const router = express.Router();

const InternshipAssignment = require("../models/InternshipAssignment");
const Application = require("../models/Application");

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
      credits: 2,
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


router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const assignment = await InternshipAssignment.findOne({
      student: studentId,
      status: { $in: ["Assigned", "Active", "Completed"] },
    })
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
        "name email"
      );

    if (!assignment) {
      return res.status(404).json({
        status: "error",
        message: "No internship assigned to this student",
      });
    }

    res.status(200).json({
      status: "success",
      assignment,
    });

  } catch (error) {
    console.error("Fetch Student Internship Error:", error);

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

module.exports = router;