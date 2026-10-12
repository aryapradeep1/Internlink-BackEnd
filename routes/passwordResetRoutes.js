
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const sendEmail = require("../utils/sendEmail");
const PasswordResetToken = require("../models/PasswordResetToken");

const Student = require("../models/Student");
const Company = require("../models/Company");
const Faculty = require("../models/Faculty");
const CompanyGuide = require("../models/CompanyGuide");
const College = require("../models/College");
const Admin = require("../models/Admin");

const router = express.Router();

const accountModels = {
  student: Student,
  company: Company,
  faculty: Faculty,
  companyGuide: CompanyGuide,
  college: College,
  admin: Admin,
};

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

// Request a password reset email
router.post("/forgot-password", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Please enter your registered email",
      });
    }

    // Return the same response whether or not an account exists.
    const genericResponse = {
      status: "success",
      message:
        "If an account exists for this email, a password reset link will be sent.",
    };

    const matches = [];

    for (const [role, Model] of Object.entries(accountModels)) {
      const account = await Model.findOne({ email });

      if (account) {
        matches.push({ role, account });
      }
    }

    if (matches.length === 0) {
      return res.status(200).json(genericResponse);
    }

    // If multiple roles use the same email, avoid choosing the wrong account.
    if (matches.length > 1) {
      return res.status(200).json(genericResponse);
    }

    const { role } = matches[0];

    // Invalidate any previous reset links for this account.
    await PasswordResetToken.deleteMany({ email, role });

    // Generate a random token; store only its hash.
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordResetToken.create({
      email,
      role,
      tokenHash,
      expiresAt,
    });

    const resetLink =
      `${FRONTEND_URL}/reset-password?token=${rawToken}`;

    try {
      await sendEmail({
        to: email,
        subject: "Reset your InternLink password",
        text:
          `We received a request to reset your InternLink password.\n\n` +
          `Use this link within 15 minutes:\n${resetLink}\n\n` +
          `If you did not request this, you can ignore this email.`,
        html: `
          <p>We received a request to reset your InternLink password.</p>
          <p><a href="${resetLink}">Reset my password</a></p>
          <p>This link expires in 15 minutes. If you did not request this, ignore this email.</p>
        `,
      });
    } catch (emailError) {
      await PasswordResetToken.deleteMany({ email, role });
      throw emailError;
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to process the password reset request",
    });
  }
});

// Set a new password using the reset link
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "Please fill all fields",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetRecord = await PasswordResetToken.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({
        status: "error",
        message: "Reset link is invalid or has expired",
      });
    }

    const Model = accountModels[resetRecord.role];

    if (!Model) {
      return res.status(400).json({
        status: "error",
        message: "Reset link is invalid or has expired",
      });
    }

    const account = await Model.findOne({
      email: resetRecord.email,
    });

    if (!account) {
      await PasswordResetToken.deleteOne({ _id: resetRecord._id });

      return res.status(400).json({
        status: "error",
        message: "Reset link is invalid or has expired",
      });
    }

    account.password = await bcrypt.hash(newPassword, 10);
    await account.save();

    // A reset link can be used only once.
    await PasswordResetToken.deleteOne({ _id: resetRecord._id });

    // Invalidate other reset links for this account.
    await PasswordResetToken.deleteMany({
      email: resetRecord.email,
      role: resetRecord.role,
    });

    return res.status(200).json({
      status: "success",
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to reset password",
    });
  }
});

module.exports = router;
