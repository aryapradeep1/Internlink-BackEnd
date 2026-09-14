const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    department: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    designation: {
      type: String,
      default: "Faculty",
    },

    // COLLEGE
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    // FACULTY APPROVAL STATUS
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Faculty", facultySchema);