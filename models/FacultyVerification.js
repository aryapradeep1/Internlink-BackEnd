const mongoose = require("mongoose");

const facultyVerificationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    collegeName: {
      type: String,
      required: true,
      trim: true,
    },

    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    verificationCode: {
      type: String,
      required: true,
      trim: true,
    },

    registered: {
      type: Boolean,
      default: false,
    },

    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "FacultyVerification",
  facultyVerificationSchema
);