const express = require("express");
const router = express.Router();

const Company = require("../models/Company");
const Application = require("../models/Application");
const Faculty = require("../models/Faculty");

// ======================================================
// COMPANY MANAGEMENT
// ======================================================

// Get all pending companies
router.get("/pending-companies", async (req, res) => {
  try {
    const companies = await Company.find({
      status: "Pending",
    });

    res.json({
      status: "success",
      companies: companies,
    });
  } catch (error) {
    console.error("Error fetching pending companies:", error);

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// ======================================================
// APPROVE COMPANY
// ======================================================

router.put("/approve-company/:id", async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      {
        status: "Approved",
      },
      {
        new: true,
      }
    );

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    res.json({
      status: "success",
      message: "Company approved successfully",
      company: company,
    });
  } catch (error) {
    console.error("Error approving company:", error);

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// ======================================================
// REJECT COMPANY
// ======================================================

router.put("/reject-company/:id", async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      {
        status: "Rejected",
      },
      {
        new: true,
      }
    );

    if (!company) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    res.json({
      status: "success",
      message: "Company rejected successfully",
      company: company,
    });
  } catch (error) {
    console.error("Error rejecting company:", error);

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// ======================================================
// COLLEGE VERIFICATION
// ======================================================

// Get applications waiting for college verification
//
// Only applications approved by the company are shown.
//
// Status:
// CompanyApproved
//
// These applications can then be:
// CollegeApproved
// OR
// CollegeRejected
// ======================================================

router.get("/college-pending-applications", async (req, res) => {
  try {
    const applications = await Application.find({
      status: "CompanyApproved",
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
      );

    res.json({
      status: "success",
      applications: applications,
    });
  } catch (error) {
    console.error(
      "Error fetching college pending applications:",
      error
    );

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// ======================================================
// COLLEGE APPROVES APPLICATION
// ======================================================

// ======================================================
// COLLEGE APPROVES APPLICATION
// AUTOMATIC FACULTY ASSIGNMENT
// ======================================================

router.put("/verify-application/:id", async (req, res) => {
  try {
    const application = await Application.findById(
      req.params.id
    );

    if (!application) {
      return res.status(404).json({
        status: "error",
        message: "Application not found",
      });
    }

    // Company must approve first
    if (application.status !== "CompanyApproved") {
      return res.status(400).json({
        status: "error",
        message:
          "Only applications approved by the company can be verified by the college.",
      });
    }

    // Get student
    const student = await Application.findById(
      application._id
    ).populate("student", "department name");

    if (!student || !student.student) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }

    const studentDepartment = student.student.department;

    // Find approved faculty from the SAME department
    const approvedFaculty = await Faculty.find({
      department: studentDepartment,
      status: "Approved",
    }).select("-password");

    // No faculty available for this department
    if (approvedFaculty.length === 0) {
      return res.status(400).json({
        status: "error",
        message:
          `No approved faculty available for ${studentDepartment} department.`,
      });
    }

    // ======================================================
    // FIND FACULTY WITH LOWEST WORKLOAD
    // ======================================================

    let selectedFaculty = null;
    let lowestWorkload = Infinity;

    for (const faculty of approvedFaculty) {
      const workload = await Application.countDocuments({
        faculty: faculty._id,
        status: "CollegeApproved",
      });

      if (workload < lowestWorkload) {
        lowestWorkload = workload;
        selectedFaculty = faculty;
      }
    }

    if (!selectedFaculty) {
      return res.status(400).json({
        status: "error",
        message: "Unable to automatically assign faculty.",
      });
    }

    // ======================================================
    // ASSIGN FACULTY + COLLEGE APPROVAL
    // ======================================================

    application.faculty = selectedFaculty._id;
    application.status = "CollegeApproved";

    await application.save();

    // Get complete updated application
    const updatedApplication =
      await Application.findById(application._id)
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

    res.json({
      status: "success",
      message:
        `Application approved and ${selectedFaculty.name} was automatically assigned as faculty guide.`,
      application: updatedApplication,
    });
  } catch (error) {
    console.error(
      "Error verifying application:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to verify application",
      error: error.message,
    });
  }
});
// ======================================================
// COLLEGE REJECTS APPLICATION
// ======================================================

router.put("/reject-application/:id", async (req, res) => {
  try {
    const application = await Application.findById(
      req.params.id
    );

    if (!application) {
      return res.status(404).json({
        status: "error",
        message: "Application not found",
      });
    }

    // Make sure company has already approved it
    if (application.status !== "CompanyApproved") {
      return res.status(400).json({
        status: "error",
        message:
          "Only applications approved by the company can be rejected by the college.",
      });
    }

    // Change status
    application.status = "CollegeRejected";

    await application.save();

    res.json({
      status: "success",
      message: "Application rejected by college",
      application: application,
    });
  } catch (error) {
    console.error(
      "Error rejecting application:",
      error
    );

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});



// ======================================================
// GET ALL FACULTY FOR ASSIGNMENT
// ======================================================

router.get("/faculty", async (req, res) => {
  try {
    const faculty = await Faculty.find({
      status: "Approved",
    })
      .select("-password")
      .sort({ name: 1 });

    res.json({
      status: "success",
      faculty,
    });
  } catch (error) {
    console.error("Error fetching faculty:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch faculty",
    });
  }
});

// ======================================================
// ASSIGN FACULTY TO APPLICATION
// ======================================================

router.put("/assign-faculty/:id", async (req, res) => {
  try {
    const { facultyId } = req.body;

    if (!facultyId) {
      return res.status(400).json({
        status: "error",
        message: "Faculty ID is required",
      });
    }

    // Check faculty exists
    const faculty = await Faculty.findById(facultyId);

    if (!faculty) {
      return res.status(404).json({
        status: "error",
        message: "Faculty not found",
      });
    }

    // Find application
    const application = await Application.findById(
      req.params.id
    );

    if (!application) {
      return res.status(404).json({
        status: "error",
        message: "Application not found",
      });
    }

    // Faculty should be assigned only after company approval
    if (application.status !== "CompanyApproved") {
      return res.status(400).json({
        status: "error",
        message:
          "Faculty can only be assigned to company-approved applications.",
      });
    }

    // Assign faculty
    application.faculty = facultyId;

    // College approval happens after faculty assignment
    application.status = "CollegeApproved";

    await application.save();

    // Return populated application
    const updatedApplication =
      await Application.findById(application._id)
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

    res.json({
      status: "success",
      message: "Faculty assigned successfully",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Error assigning faculty:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to assign faculty",
      error: error.message,
    });
  }
});



// ======================================================
// FACULTY MANAGEMENT
// ======================================================

// GET ALL PENDING FACULTY
router.get("/pending-faculty", async (req, res) => {
  try {
    const faculty = await Faculty.find({
      status: "Pending",
    })
      .select("-password")
      .sort({ name: 1 });

    res.json({
      status: "success",
      faculty,
    });
  } catch (error) {
    console.error("Error fetching pending faculty:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch pending faculty",
    });
  }
});

// ======================================================
// APPROVE FACULTY
// ======================================================

router.put("/approve-faculty/:id", async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      {
        status: "Approved",
      },
      {
        new: true,
      }
    ).select("-password");

    if (!faculty) {
      return res.status(404).json({
        status: "error",
        message: "Faculty not found",
      });
    }

    res.json({
      status: "success",
      message: "Faculty approved successfully",
      faculty,
    });
  } catch (error) {
    console.error("Error approving faculty:", error);

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// ======================================================
// REJECT FACULTY
// ======================================================

router.put("/reject-faculty/:id", async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      {
        status: "Rejected",
      },
      {
        new: true,
      }
    ).select("-password");

    if (!faculty) {
      return res.status(404).json({
        status: "error",
        message: "Faculty not found",
      });
    }

    res.json({
      status: "success",
      message: "Faculty rejected successfully",
      faculty,
    });
  } catch (error) {
    console.error("Error rejecting faculty:", error);

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

module.exports = router;