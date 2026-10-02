const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    // Internship assignment this attendance belongs to
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternshipAssignment",
      required: true,
    },

    // Student
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // Faculty Guide who will verify the attendance
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    // Company Guide who marked the attendance
    companyGuide: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Attendance date
    date: {
      type: Date,
      required: true,
    },

    // Attendance status
    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day"],
      required: true,
      default: "Present",
    },

    // Check-in time
    checkIn: {
      type: String,
      default: "",
    },

    // Check-out time
    checkOut: {
      type: String,
      default: "",
    },

    // Total hours for that day
    totalHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Work performed by the student that day
    workDescription: {
      type: String,
      trim: true,
      default: "",
    },

    // Faculty verification
    verificationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    // Optional faculty comment when verifying
    facultyComment: {
      type: String,
      trim: true,
      default: "",
    },

    // When faculty verified it
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
  One attendance record per student per internship per day.
  This prevents duplicate attendance entries for the same day.
*/
attendanceSchema.index(
  {
    assignment: 1,
    student: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

const Attendance = mongoose.model(
  "Attendance",
  attendanceSchema
);

module.exports = Attendance;