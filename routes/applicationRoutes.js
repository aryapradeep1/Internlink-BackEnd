const express = require("express");
const router = express.Router();

const Application = require("../models/Application");
const Student = require("../models/Student");
const Company = require("../models/Company");
const Internship = require("../models/Internship");

// =====================================================
// SUBMIT INTERNSHIP APPLICATION
// =====================================================

router.post("/apply", async (req, res) => {
  try {
    const {
      student,
      company,
      internship,
      position,
      whyApply,
      resume,
    } = req.body;

    // Check required fields
    if (
      !student ||
      !company ||
      !internship ||
      !position ||
      !whyApply
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please provide all required fields",
      });
    }

    // Check student
    const studentExists = await Student.findById(student);

    if (!studentExists) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }

    // Check company
    const companyExists = await Company.findById(company);

    if (!companyExists) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    // Check internship belongs to this company
    const internshipExists = await Internship.findOne({
      _id: internship,
      company: company,
    });

    if (!internshipExists) {
      return res.status(404).json({
        status: "error",
        message: "Internship not found for this company",
      });
    }

    // Check whether student already applied
    const existingApplication = await Application.findOne({
      student: student,
      internship: internship,
    });

    if (existingApplication) {
      return res.status(400).json({
        status: "error",
        message: "You have already applied to this internship",
      });
    }

    // Create application
    const application = new Application({
      student,
      company,
      internship,
      position,
      whyApply,
      resume: resume || "",
      status: "Pending",
    });

    await application.save();

    res.status(201).json({
      status: "success",
      message: "Internship application submitted successfully",
      application,
    });
  } catch (error) {
    console.error("Application Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to submit application",
      error: error.message,
    });
  }
});

// =====================================================
// GET ALL APPLICATIONS OF A STUDENT
// =====================================================

router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const studentExists = await Student.findById(studentId);

    if (!studentExists) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }

    const applications = await Application.find({
  student: studentId,
})
  .populate("company", "companyName location email")
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
    console.error("Fetch Student Applications Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch applications",
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

    // Check company
    const companyExists = await Company.findById(companyId);

    if (!companyExists) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    // Find applications for this company
    const applications = await Application.find({
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
    console.error("Fetch Company Applications Error:", error);

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

// =====================================================
// COMPANY APPROVE OR REJECT APPLICATION
// =====================================================

router.put("/status/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    // Company can only use these two statuses
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

    const application = await Application.findById(
      applicationId
    );

    if (!application) {
      return res.status(404).json({
        status: "error",
        message: "Application not found",
      });
    }

    // Application must still be pending
    if (application.status !== "Pending") {
      return res.status(400).json({
        status: "error",
        message:
          "This application has already been processed",
      });
    }

    // Company approves or rejects only
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
      message: "Failed to update application status",
      error: error.message,
    });
  }
});
// =====================================================
// TEMPORARY UPDATE APPLICATION COMPANY
// =====================================================

router.put("/company/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { companyId } = req.body;

    const application = await Application.findById(
      applicationId
    );

    if (!application) {
      return res.status(404).json({
        status: "error",
        message: "Application not found",
      });
    }

    const companyExists = await Company.findById(companyId);

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
      message: "Application company updated successfully",
      application,
    });
  } catch (error) {
    console.error(
      "Update Application Company Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to update application company",
      error: error.message,
    });
  }
});

module.exports = router;