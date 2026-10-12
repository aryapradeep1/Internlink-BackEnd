
const mongoose = require("mongoose");

const passwordResetTokenSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    role: {
      type: String,
      required: true,
      enum: [
        "student",
        "company",
        "faculty",
        "companyGuide",
        "college",
        "admin",
      ],
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "PasswordResetToken",
  passwordResetTokenSchema
);
