const express = require("express");
const router = express.Router();

const Internship = require("../models/Internship");
const Company = require("../models/Company");

// =====================================================
// POST A NEW INTERNSHIP
// =====================================================

router.post("/", async (req, res) => {
  try {
    const {
      company,
      title,
      description,
      location,
      eligibility,
      skillsRequired,
      duration,
      deadline,
    } = req.body;

    // Check required fields
    if (
      !company ||
      !title ||
      !description ||
      !location ||
      !eligibility ||
      !skillsRequired ||
      !duration ||
      !deadline
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please provide all required fields",
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

    // Only approved companies can post
    if (companyExists.status !== "Approved") {
      return res.status(403).json({
        status: "error",
        message:
          "Only approved companies can post internships",
      });
    }

    // Create internship
    const internship = new Internship({
      company,
      title,
      description,
      location,
      eligibility,
      skillsRequired,
      duration,
      deadline,
    });

    await internship.save();

    res.status(201).json({
      status: "success",
      message: "Internship posted successfully",
      internship,
    });
  } catch (error) {
    console.error("Post Internship Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to post internship",
      error: error.message,
    });
  }
});

// =====================================================
// GET ALL OPEN INTERNSHIPS
// =====================================================

router.get("/", async (req, res) => {
  try {
    const internships = await Internship.find({
      status: "Open",
    })
      .populate("company", "companyName email location")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      internships,
    });
  } catch (error) {
    console.error("Fetch Internships Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch internships",
      error: error.message,
    });
  }
});

// =====================================================
// GET INTERNSHIPS POSTED BY A COMPANY
// IMPORTANT: This comes BEFORE /:id
// =====================================================

router.get("/company/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;

    const companyExists = await Company.findById(companyId);

    if (!companyExists) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    const internships = await Internship.find({
      company: companyId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      internships,
    });
  } catch (error) {
    console.error(
      "Fetch Company Internships Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to fetch company internships",
      error: error.message,
    });
  }
});

// =====================================================
// GET SINGLE INTERNSHIP
// IMPORTANT: Keep this AFTER /company/:companyId
// =====================================================

router.get("/:id", async (req, res) => {
  try {
    const internship = await Internship.findById(
      req.params.id
    ).populate(
      "company",
      "companyName email location"
    );

    if (!internship) {
      return res.status(404).json({
        status: "error",
        message: "Internship not found",
      });
    }

    res.status(200).json({
      status: "success",
      internship,
    });
  } catch (error) {
    console.error("Fetch Internship Error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch internship",
      error: error.message,
    });
  }
});

module.exports = router;