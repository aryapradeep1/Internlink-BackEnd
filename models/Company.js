const mongoose = require("mongoose");

const internshipSchema = new mongoose.Schema(
  {
    position: {
      type: String,
      required: true,
    },

    eligibility: {
      type: String,
      required: true,
    },

    skillsRequired: {
      type: String,
      required: true,
    },

    duration: {
      type: String,
      required: true,
    },

    deadline: {
      type: Date,
      required: true,
    },
  },
  { _id: true }
);

const companySchema = new mongoose.Schema(
  {
    companyName: {
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

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    description: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    internships: [internshipSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);