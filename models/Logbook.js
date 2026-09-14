const mongoose = require("mongoose");

const logbookSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    hoursWorked: {
      type: Number,
      required: true,
      min: 0.5,
      max: 24,
    },

    workDone: {
      type: String,
      required: true,
      trim: true,
    },

    learnings: {
      type: String,
      required: true,
      trim: true,
    },

    facultyStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    companyGuideStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Logbook", logbookSchema);