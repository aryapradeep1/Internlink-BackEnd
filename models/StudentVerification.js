const mongoose = require("mongoose");

const studentVerificationSchema = new mongoose.Schema(
  {
    // Student name from college Excel
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // College name from Excel
    collegeName: {
      type: String,
      required: true,
      trim: true,
    },

    // Link to the actual College document
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    // Student register number
    registerNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Department
    department: {
      type: String,
      required: true,
      trim: true,
    },

    // Faculty assigned by college
    assignedFacultyName: {
      type: String,
      required: true,
      trim: true,
    },

    // Secret verification code given in Excel
    verificationCode: {
      type: String,
      required: true,
      trim: true,
    },

    // Whether this student has already completed registration
    registered: {
      type: Boolean,
      default: false,
    },

    // Created student account
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "StudentVerification",
  studentVerificationSchema
);