const mongoose = require("mongoose");

const internshipAssignmentSchema = new mongoose.Schema(
  {
    // Student who is doing the internship
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // Internship selected by the college
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: true,
    },

    // Company providing the internship
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // Faculty guide assigned by college
    facultyGuide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },

    // Internship status
    status: {
      type: String,
      enum: ["Assigned", "Active", "Completed"],
      default: "Assigned",
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    // Company certificate
    certificate: {
      type: String,
      default: "",
    },

    // Faculty marks
    mark: {
      type: Number,
      default: null,
    },

    // FYUGP internship credit
    credits: {
      type: Number,
      default: 2,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "InternshipAssignment",
  internshipAssignmentSchema
);