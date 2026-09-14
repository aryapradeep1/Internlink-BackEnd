const express = require("express");
const router = express.Router();

const Logbook = require("../models/Logbook");
const Student = require("../models/Student");
const Internship = require("../models/Internship");
const InternshipAssignment = require("../models/InternshipAssignment");
// CREATE DAILY LOGBOOK ENTRY
router.post("/add", async (req, res) => {
  try {
    const {
      student,
      internship,
      date,
      hoursWorked,
      workDone,
      learnings,
    } = req.body;

    if (
      !student ||
      !internship ||
      !date ||
      hoursWorked === undefined ||
      hoursWorked === null ||
      !workDone ||
      !learnings
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please provide all required fields",
      });
    }

    const numericHours = Number(hoursWorked);

    if (
      isNaN(numericHours) ||
      numericHours <= 0 ||
      numericHours > 24
    ) {
      return res.status(400).json({
        status: "error",
        message: "Hours worked must be between 0.5 and 24 hours",
      });
    }

    const studentExists =
      await Student.findById(student);

    if (!studentExists) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }

    const internshipExists =
      await Internship.findById(internship);

    if (!internshipExists) {
      return res.status(404).json({
        status: "error",
        message: "Internship not found",
      });
    }

    const existingEntry =
      await Logbook.findOne({
        student: student,
        internship: internship,
        date: new Date(date),
      });

    if (existingEntry) {
      return res.status(400).json({
        status: "error",
        message:
          "A logbook entry already exists for this date",
      });
    }

    const logbook = new Logbook({
      student,
      internship,
      date,
      hoursWorked: numericHours,
      workDone,
      learnings,
      facultyStatus: "Pending",
      companyGuideStatus: "Pending",
    });

    await logbook.save();

    res.status(201).json({
      status: "success",
      message: "Logbook entry added successfully",
      logbook,
    });
  } catch (error) {
    console.error(
      "Add Logbook Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to add logbook entry",
      error: error.message,
    });
  }
});

// GET STUDENT LOGBOOK ENTRIES
router.get(
  "/student/:studentId",
  async (req, res) => {
    try {
      const { studentId } = req.params;

      const studentExists =
        await Student.findById(studentId);

      if (!studentExists) {
        return res.status(404).json({
          status: "error",
          message: "Student not found",
        });
      }

      const logbooks =
        await Logbook.find({
          student: studentId,
        })
          .populate(
            "internship",
            "title description company location duration"
          )
          .sort({ date: -1 });

      res.status(200).json({
        status: "success",
        logbooks,
      });
    } catch (error) {
      console.error(
        "Fetch Student Logbook Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message: "Failed to fetch student logbook",
        error: error.message,
      });
    }
  }
);

// GET LOGBOOK ENTRIES FOR AN INTERNSHIP
router.get(
  "/internship/:internshipId",
  async (req, res) => {
    try {
      const { internshipId } = req.params;

      const internshipExists =
        await Internship.findById(
          internshipId
        );

      if (!internshipExists) {
        return res.status(404).json({
          status: "error",
          message: "Internship not found",
        });
      }

      const logbooks =
        await Logbook.find({
          internship: internshipId,
        })
          .populate(
            "student",
            "name email registerNumber department semester"
          )
          .sort({ date: -1 });

      res.status(200).json({
        status: "success",
        logbooks,
      });
    } catch (error) {
      console.error(
        "Fetch Internship Logbook Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message: "Failed to fetch internship logbook",
        error: error.message,
      });
    }
  }
);

// ==========================================
// FACULTY - VIEW ASSIGNED STUDENTS' LOGBOOKS
// ==========================================

router.get("/faculty/:facultyId", async (req, res) => {
  try {
    const { facultyId } = req.params;

    // Find students assigned to this faculty guide
    const assignments = await InternshipAssignment.find({
      facultyGuide: facultyId,
    })
      .populate("student")
      .populate("internship")
      .populate("company");

    if (!assignments || assignments.length === 0) {
      return res.json([]);
    }

    // Get student IDs assigned to this faculty
    const studentIds = assignments.map(
      (assignment) => assignment.student._id
    );

    // Get logbook entries of those students
    const logbooks = await Logbook.find({
      student: { $in: studentIds },
    })
      .populate("student")
      .populate("internship")
      .sort({ date: -1 });

    res.json(logbooks);
  } catch (error) {
    console.error("Faculty logbook fetch error:", error);

    res.status(500).json({
      message: "Failed to fetch faculty logbooks",
      error: error.message,
    });
  }
});


// ==========================================
// FACULTY - APPROVE LOGBOOK
// ==========================================

router.put("/faculty/approve/:logbookId", async (req, res) => {
  try {
    const { logbookId } = req.params;

    const logbook = await Logbook.findByIdAndUpdate(
      logbookId,
      {
        facultyStatus: "Approved",
      },
      { new: true }
    );

    if (!logbook) {
      return res.status(404).json({
        message: "Logbook entry not found",
      });
    }

    res.json({
      message: "Logbook approved successfully",
      logbook,
    });
  } catch (error) {
    console.error("Faculty approve error:", error);

    res.status(500).json({
      message: "Failed to approve logbook",
      error: error.message,
    });
  }
});


// ==========================================
// FACULTY - REJECT LOGBOOK
// ==========================================

router.put("/faculty/reject/:logbookId", async (req, res) => {
  try {
    const { logbookId } = req.params;

    const logbook = await Logbook.findByIdAndUpdate(
      logbookId,
      {
        facultyStatus: "Rejected",
      },
      { new: true }
    );

    if (!logbook) {
      return res.status(404).json({
        message: "Logbook entry not found",
      });
    }

    res.json({
      message: "Logbook rejected successfully",
      logbook,
    });
  } catch (error) {
    console.error("Faculty reject error:", error);

    res.status(500).json({
      message: "Failed to reject logbook",
      error: error.message,
    });
  }
});

// ==========================================
// FACULTY - VIEW ASSIGNED STUDENTS' LOGBOOKS
// ==========================================

router.get("/faculty/:facultyId", async (req, res) => {
  try {
    const { facultyId } = req.params;

    // Find students assigned to this faculty
    const assignments = await InternshipAssignment.find({
      facultyGuide: facultyId,
    })
      .populate("student")
      .populate("internship")
      .populate("company");

    if (!assignments || assignments.length === 0) {
      return res.json([]);
    }

    // Get student IDs
    const studentIds = assignments.map(
      (assignment) => assignment.student._id
    );

    // Get logbooks of assigned students
    const logbooks = await Logbook.find({
      student: { $in: studentIds },
    })
      .populate("student")
      .populate("internship")
      .sort({ date: -1 });

    res.json(logbooks);
  } catch (error) {
    console.error("Faculty logbook fetch error:", error);

    res.status(500).json({
      message: "Failed to fetch faculty logbooks",
      error: error.message,
    });
  }
});

// ==========================================
// FACULTY - APPROVE LOGBOOK
// ==========================================

router.put("/faculty/approve/:logbookId", async (req, res) => {
  try {
    const { logbookId } = req.params;

    const logbook = await Logbook.findByIdAndUpdate(
      logbookId,
      {
        facultyStatus: "Approved",
      },
      { new: true }
    );

    if (!logbook) {
      return res.status(404).json({
        message: "Logbook entry not found",
      });
    }

    res.json({
      message: "Logbook approved successfully",
      logbook,
    });
  } catch (error) {
    console.error("Faculty approve error:", error);

    res.status(500).json({
      message: "Failed to approve logbook",
      error: error.message,
    });
  }
});


// ==========================================
// FACULTY - REJECT LOGBOOK
// ==========================================

router.put("/faculty/reject/:logbookId", async (req, res) => {
  try {
    const { logbookId } = req.params;

    const logbook = await Logbook.findByIdAndUpdate(
      logbookId,
      {
        facultyStatus: "Rejected",
      },
      { new: true }
    );

    if (!logbook) {
      return res.status(404).json({
        message: "Logbook entry not found",
      });
    }

    res.json({
      message: "Logbook rejected successfully",
      logbook,
    });
  } catch (error) {
    console.error("Faculty reject error:", error);

    res.status(500).json({
      message: "Failed to reject logbook",
      error: error.message,
    });
  }
});


// ======================================================
// COMPANY GUIDE - VIEW ASSIGNED STUDENTS' LOGBOOKS
// ======================================================

router.get(
  "/company-guide/:guideId",
  async (req, res) => {
    try {
      const { guideId } = req.params;

      // Find internships assigned to this company guide
      const assignments =
        await InternshipAssignment.find({
          companyGuide: guideId,
        })
          .populate("student")
          .populate("internship")
          .populate("company");

      if (!assignments || assignments.length === 0) {
        return res.json([]);
      }

      // Get student IDs assigned to this company guide
      const studentIds = assignments.map(
        (assignment) => assignment.student._id
      );

      // Get logbooks of those students
      const logbooks = await Logbook.find({
        student: { $in: studentIds },
      })
        .populate("student")
        .populate("internship")
        .sort({ date: -1 });

      res.json(logbooks);
    } catch (error) {
      console.error(
        "Company Guide Logbook Fetch Error:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch company guide logbooks",
        error: error.message,
      });
    }
  }
);


// Company Guide approves a logbook
router.put(
  "/company-guide/approve/:logbookId",
  async (req, res) => {
    try {
      const { logbookId } = req.params;

      const logbook = await Logbook.findById(logbookId);

      if (!logbook) {
        return res.status(404).json({
          message: "Logbook entry not found",
        });
      }

      logbook.companyGuideStatus = "Approved";
      await logbook.save();

      res.json({
        message: "Logbook approved by Company Guide",
        logbook,
      });
    } catch (error) {
      console.error("Company Guide approve error:", error);

      res.status(500).json({
        message: "Failed to approve logbook",
        error: error.message,
      });
    }
  }
);


// Company Guide rejects a logbook
router.put(
  "/company-guide/reject/:logbookId",
  async (req, res) => {
    try {
      const { logbookId } = req.params;

      const logbook = await Logbook.findById(logbookId);

      if (!logbook) {
        return res.status(404).json({
          message: "Logbook entry not found",
        });
      }

      logbook.companyGuideStatus = "Rejected";
      await logbook.save();

      res.json({
        message: "Logbook rejected by Company Guide",
        logbook,
      });
    } catch (error) {
      console.error("Company Guide reject error:", error);

      res.status(500).json({
        message: "Failed to reject logbook",
        error: error.message,
      });
    }
  }
);

module.exports = router;