const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    // Student who applied
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // Company that owns the internship
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // Specific internship the student applied for
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      required: true,
    },

    // Faculty assigned by college
faculty: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Faculty",
  default: null,
},

    // Internship position
    position: {
      type: String,
      required: true,
    },

    // Why student wants to apply
    whyApply: {
      type: String,
      required: true,
    },

    // Resume link
    resume: {
      type: String,
      default: "",
    },

    // Application status
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Application", applicationSchema);