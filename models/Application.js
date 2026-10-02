const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: true,
    },

    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },

    position: {
      type: String,
      required: true,
    },

    resume: {
      type: String,
      required: true,
    },

    markList: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "CompanyApproved",
        "CompanyRejected",
        "CollegeApproved",
        "CollegeRejected",
      ],
      default: "Pending",
    },

    // ==========================================
    // COMPANY CONFIRMATION LETTER
    // ==========================================

    confirmationLetter: {
      subject: {
        type: String,
        default: "",
      },

      message: {
        type: String,
        default: "",
      },

      sentAt: {
        type: Date,
        default: null,
      },
    },

    // ==========================================
    // FORWARDED TO COLLEGE
    // ==========================================

    forwardedToCollege: {
      type: Boolean,
      default: false,
    },

    forwardedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Application = mongoose.model(
  "Application",
  applicationSchema
);

module.exports = Application;