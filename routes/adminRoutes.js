const express = require("express");
const router = express.Router();

const Company = require("../models/Company");
const College = require("../models/College");

// ======================================================
// COMPANY MANAGEMENT
// ======================================================

// ======================================================
// GET PENDING COMPANIES
// ======================================================

router.get("/pending-companies", async (req, res) => {
  try {
    const companies = await Company.find({
      status: "Pending",
    });

    res.json({
      status: "success",
      companies,
    });
  } catch (error) {
    console.error(
      "Error fetching pending companies:",
      error
    );

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// ======================================================
// GET APPROVED COMPANIES
// ======================================================

router.get("/approved-companies", async (req, res) => {
  try {
    const companies = await Company.find({
      status: "Approved",
    }).sort({
      createdAt: -1,
    });

    res.json({
      status: "success",
      companies,
    });
  } catch (error) {
    console.error(
      "Error fetching approved companies:",
      error
    );

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
      company,
    });
  } catch (error) {
    console.error(
      "Error approving company:",
      error
    );

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
      company,
    });
  } catch (error) {
    console.error(
      "Error rejecting company:",
      error
    );

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// ======================================================
// COLLEGE MANAGEMENT
// ======================================================

// ======================================================
// GET ALL COLLEGES
// ======================================================

router.get("/colleges", async (req, res) => {
  try {
    const colleges = await College.find().sort({
      createdAt: -1,
    });

    res.json({
      status: "success",
      colleges,
    });
  } catch (error) {
    console.error(
      "Error fetching colleges:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch colleges",
    });
  }
});

// ======================================================
// GET PENDING COLLEGES
// ======================================================

router.get("/pending-colleges", async (req, res) => {
  try {
    const colleges = await College.find({
      status: "Pending",
    }).sort({
      createdAt: -1,
    });

    res.json({
      status: "success",
      colleges,
    });
  } catch (error) {
    console.error(
      "Error fetching pending colleges:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch pending colleges",
    });
  }
});

// ======================================================
// GET APPROVED COLLEGES
// ======================================================

router.get("/approved-colleges", async (req, res) => {
  try {
    const colleges = await College.find({
      status: "Approved",
    }).sort({
      createdAt: -1,
    });

    res.json({
      status: "success",
      colleges,
    });
  } catch (error) {
    console.error(
      "Error fetching approved colleges:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch approved colleges",
    });
  }
});

// ======================================================
// APPROVE COLLEGE
// ======================================================

router.put("/approve-college/:id", async (req, res) => {
  try {
    const college = await College.findByIdAndUpdate(
      req.params.id,
      {
        status: "Approved",
      },
      {
        new: true,
      }
    );

    if (!college) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    res.json({
      status: "success",
      message: "College approved successfully",
      college,
    });
  } catch (error) {
    console.error(
      "Error approving college:",
      error
    );

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// ======================================================
// REJECT COLLEGE
// ======================================================

router.put("/reject-college/:id", async (req, res) => {
  try {
    const college = await College.findByIdAndUpdate(
      req.params.id,
      {
        status: "Rejected",
      },
      {
        new: true,
      }
    );

    if (!college) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    res.json({
      status: "success",
      message: "College rejected successfully",
      college,
    });
  } catch (error) {
    console.error(
      "Error rejecting college:",
      error
    );

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// ======================================================
// GET SINGLE COLLEGE
// ======================================================

router.get("/colleges/:id", async (req, res) => {
  try {
    const college = await College.findById(
      req.params.id
    );

    if (!college) {
      return res.status(404).json({
        status: "error",
        message: "College not found",
      });
    }

    res.json({
      status: "success",
      college,
    });
  } catch (error) {
    console.error(
      "Error fetching college:",
      error
    );

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

module.exports = router;