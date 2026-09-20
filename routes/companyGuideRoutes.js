const express = require("express");
const bcrypt = require("bcryptjs");
const CompanyGuide = require("../models/CompanyGuide");
const Company = require("../models/Company");

const router = express.Router();

// ======================================================
// COMPANY GUIDE REGISTRATION
// ======================================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      company,
      employeeId,
      password,
    } = req.body;

    if (
      !name ||
      !email ||
      !company ||
      !employeeId ||
      !password
    ) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required",
      });
    }

    const existingGuide = await CompanyGuide.findOne({
      email,
    });

    if (existingGuide) {
      return res.status(400).json({
        status: "error",
        message:
          "Company Guide already registered with this email",
      });
    }

    const companyExists = await Company.findById(company);

    if (!companyExists) {
      return res.status(404).json({
        status: "error",
        message: "Company not found",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const guide = await CompanyGuide.create({
      name,
      email,
      company,
      employeeId,
      password: hashedPassword,
      status: "Pending",
    });

    res.status(201).json({
      status: "success",
      message:
        "Company Guide registered successfully. Waiting for company approval.",
      guide: {
        id: guide._id,
        name: guide.name,
        email: guide.email,
        company: guide.company,
        employeeId: guide.employeeId,
        status: guide.status,
      },
    });
  } catch (error) {
    console.error(
      "Company Guide Registration Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to register Company Guide",
      error: error.message,
    });
  }
});

// ======================================================
// COMPANY GUIDE APPROVAL / REJECTION
// ======================================================

router.put("/status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (
      !["Approved", "Rejected"].includes(status)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status",
      });
    }

    const guide = await CompanyGuide.findById(
      req.params.id
    );

    if (!guide) {
      return res.status(404).json({
        status: "error",
        message: "Company Guide not found",
      });
    }

    guide.status = status;

    await guide.save();

    res.json({
      status: "success",
      message: `Company Guide ${status.toLowerCase()} successfully`,
      guide: {
        id: guide._id,
        name: guide.name,
        email: guide.email,
        company: guide.company,
        employeeId: guide.employeeId,
        status: guide.status,
      },
    });
  } catch (error) {
    console.error(
      "Company Guide Status Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message:
        "Failed to update Company Guide status",
      error: error.message,
    });
  }
});

// ======================================================
// COMPANY GUIDE LOGIN
// ======================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message:
          "Email and password are required",
      });
    }

    const guide = await CompanyGuide.findOne({
      email,
    });

    if (!guide) {
      return res.status(404).json({
        status: "error",
        message: "Company Guide not found",
      });
    }

    if (guide.status !== "Approved") {
      return res.status(403).json({
        status: "error",
        message:
          "Company Guide is not approved yet",
      });
    }

    const isPasswordValid =
      await bcrypt.compare(
        password,
        guide.password
      );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid password",
      });
    }

    res.json({
      status: "success",
      message:
        "Company Guide login successful",
      guide: {
        id: guide._id,
        name: guide.name,
        email: guide.email,
        company: guide.company,
        employeeId: guide.employeeId,
        status: guide.status,
      },
    });
  } catch (error) {
    console.error(
      "Company Guide Login Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Failed to login",
      error: error.message,
    });
  }
});

// ======================================================
// GET COMPANY GUIDES FOR A COMPANY
// ======================================================
// Shows Pending, Approved and Rejected guides
// belonging to this company.
// ======================================================

router.get("/company/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;

    const guides = await CompanyGuide.find({
      company: companyId,
    }).select(
      "name email employeeId status"
    );

    res.status(200).json({
      status: "success",
      guides,
    });
  } catch (error) {
    console.error(
      "Fetch Company Guides Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message:
        "Failed to fetch Company Guides",
      error: error.message,
    });
  }
});

// ======================================================
// GET COMPANY GUIDE PROFILE
// ======================================================

router.get("/profile/:id", async (req, res) => {
  try {
    const guide = await CompanyGuide.findById(
      req.params.id
    )
      .select("-password")
      .populate(
        "company",
        "companyName email location"
      );

    if (!guide) {
      return res.status(404).json({
        status: "error",
        message: "Company Guide not found",
      });
    }

    res.status(200).json({
      status: "success",
      guide,
    });
  } catch (error) {
    console.error(
      "Get Company Guide Profile Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message:
        "Failed to load Company Guide profile",
    });
  }
});

// ======================================================
// UPDATE COMPANY GUIDE PROFILE
// ======================================================

router.put("/profile/:id", async (req, res) => {
  try {
    const {
      name,
      email,
      employeeId,
    } = req.body;

    if (!name || !email || !employeeId) {
      return res.status(400).json({
        status: "error",
        message:
          "Please fill all required fields",
      });
    }

    const guide = await CompanyGuide.findById(
      req.params.id
    );

    if (!guide) {
      return res.status(404).json({
        status: "error",
        message: "Company Guide not found",
      });
    }

    const existingEmail =
      await CompanyGuide.findOne({
        email,
        _id: { $ne: req.params.id },
      });

    if (existingEmail) {
      return res.status(400).json({
        status: "error",
        message:
          "Company Guide email already registered",
      });
    }

    guide.name = name;
    guide.email = email;
    guide.employeeId = employeeId;

    await guide.save();

    res.status(200).json({
      status: "success",
      message:
        "Company Guide profile updated successfully",
      guide: {
        id: guide._id,
        name: guide.name,
        email: guide.email,
        company: guide.company,
        employeeId: guide.employeeId,
        status: guide.status,
      },
    });
  } catch (error) {
    console.error(
      "Update Company Guide Profile Error:",
      error
    );

    res.status(500).json({
      status: "error",
      message:
        "Failed to update Company Guide profile",
    });
  }
});

// ======================================================
// CHANGE COMPANY GUIDE PASSWORD
// ======================================================

router.put(
  "/change-password/:id",
  async (req, res) => {
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
          message:
            "Please fill all password fields",
        });
      }

      if (
        newPassword !== confirmPassword
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "New passwords do not match",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          status: "error",
          message:
            "New password must be at least 6 characters",
        });
      }

      const guide =
        await CompanyGuide.findById(
          req.params.id
        );

      if (!guide) {
        return res.status(404).json({
          status: "error",
          message:
            "Company Guide not found",
        });
      }

      const isPasswordCorrect =
        await bcrypt.compare(
          currentPassword,
          guide.password
        );

      if (!isPasswordCorrect) {
        return res.status(401).json({
          status: "error",
          message:
            "Current password is incorrect",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          10
        );

      guide.password = hashedPassword;

      await guide.save();

      res.status(200).json({
        status: "success",
        message:
          "Password changed successfully",
      });
    } catch (error) {
      console.error(
        "Change Company Guide Password Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to change password",
      });
    }
  }
);

module.exports = router;