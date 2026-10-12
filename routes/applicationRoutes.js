
const express = require("express");
const { notifyUser, notifyStudent, notifyCollege } = require("../utils/notifications");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Application = require("../models/Application");
const Student = require("../models/Student");
const Company = require("../models/Company");
const Internship = require("../models/Internship");
const InternshipAssignment = require("../models/InternshipAssignment");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const uploadsFolder = path.join(__dirname, "..", "uploads");
const tempFolder = path.join(uploadsFolder, "temp");
const resumeFolder = path.join(uploadsFolder, "resumes");
const markListFolder = path.join(uploadsFolder, "marklists");

[tempFolder, resumeFolder, markListFolder].forEach((folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempFolder);
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post(
  "/apply",
  protect,
  authorize("student"),
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "markList", maxCount: 1 },
  ]),
  async (req, res) => {
    let resumeTempPath = null;
    let markListTempPath = null;

    try {
      const { student, company, internship, position } = req.body;
      const resume = req.files?.resume?.[0];
      const markList = req.files?.markList?.[0];

      if (
        !student ||
        !company ||
        !internship ||
        !position ||
        !resume ||
        !markList
      ) {
        if (resume) fs.unlinkSync(resume.path);
        if (markList) fs.unlinkSync(markList.path);

        return res.status(400).json({
          status: "error",
          message: "Please provide all required fields and documents",
        });
      }

      resumeTempPath = resume.path;
      markListTempPath = markList.path;

      if (String(req.user.id) !== String(student)) {
        if (fs.existsSync(resumeTempPath)) {
          fs.unlinkSync(resumeTempPath);
        }
        if (fs.existsSync(markListTempPath)) {
          fs.unlinkSync(markListTempPath);
        }

        return res.status(403).json({
          status: "error",
          message: "You can only submit applications for your own account",
        });
      }

      const studentExists = await Student.findById(student);
      if (!studentExists) {
        throw new Error("Student not found");
      }

      const companyExists = await Company.findById(company);
      if (!companyExists) {
        throw new Error("Company not found");
      }

      const internshipExists = await Internship.findOne({
        _id: internship,
        company: company,
      });

      if (!internshipExists) {
        throw new Error("Internship not found for this company");
      }

      const existingApplication = await Application.findOne({
        student: student,
        internship: internship,
      });

      if (existingApplication) {
        throw new Error("You have already applied to this internship");
      }

      const application = new Application({
        student,
        company,
        internship,
        position,
        resume: resumeTempPath,
        markList: markListTempPath,
        status: "Pending",
      });

      await application.save();

      const resumeFileName = path.basename(resumeTempPath);
      const markListFileName = path.basename(markListTempPath);

      const finalResumePath = path.join(resumeFolder, resumeFileName);
      const finalMarkListPath = path.join(markListFolder, markListFileName);

      fs.renameSync(resumeTempPath, finalResumePath);
      fs.renameSync(markListTempPath, finalMarkListPath);

      application.resume = `uploads/resumes/${resumeFileName}`;
      application.markList = `uploads/marklists/${markListFileName}`;

      await application.save();
      try {
        await application.populate([{ path: "student", select: "name" }, { path: "company", select: "companyName" }, { path: "internship", select: "title" }]);
        await notifyUser({ recipientId: application.company._id, recipientRole: "company", type: "new_application", message: `${application.student?.name || "A student"} applied for ${application.internship?.title || "an internship"}`, relatedEntityId: application._id, target: "applications", eventKey: `application:${application._id}` });
      } catch (notificationError) { console.error("Application notification skipped:", notificationError.message); }

      res.status(201).json({
        status: "success",
        message: "Internship application submitted successfully",
        application,
      });
    } catch (error) {
      console.error("Application Error:", error);

      try {
        if (resumeTempPath && fs.existsSync(resumeTempPath)) {
          fs.unlinkSync(resumeTempPath);
        }
        if (markListTempPath && fs.existsSync(markListTempPath)) {
          fs.unlinkSync(markListTempPath);
        }
      } catch (cleanupError) {
        console.error("Temporary file cleanup error:", cleanupError);
      }

      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  }
);

router.get(
  "/company/:companyId",
  protect,
  authorize("company"),
  async (req, res) => {
    try {
      const { companyId } = req.params;

      if (String(req.user.id) !== String(companyId)) {
        return res.status(403).json({
          status: "error",
          message: "You can only view applications for your own company",
        });
      }

      const companyExists = await Company.findById(companyId);

      if (!companyExists) {
        return res.status(404).json({
          status: "error",
          message: "Company not found",
        });
      }

      const applications = await Application.find({
        company: companyId,
      })
        .populate(
          "student",
          "name email registerNumber department semester phone"
        )
        .populate(
          "internship",
          "title description location duration eligibility skillsRequired deadline"
        )
        .sort({ createdAt: -1 });

      const applicationsWithAssignments = await Promise.all(
        applications.map(async (application) => {
          const assignment = await InternshipAssignment.findOne({
            student: application.student?._id,
            internship: application.internship?._id,
            company: companyId,
          })
            .populate("companyGuide", "name email employeeId")
            .populate("facultyGuide", "name email department");

          return {
            ...application.toObject(),
            assignmentId: assignment?._id || null,
            assignmentStatus: assignment?.status || null,
            certificate: assignment?.certificate || null,
            companyGuide: assignment?.companyGuide || null,
            facultyGuide: assignment?.facultyGuide || null,
          };
        })
      );

      res.status(200).json({
        status: "success",
        applications: applicationsWithAssignments,
      });
    } catch (error) {
      console.error("Fetch Company Applications Error:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch company applications",
        error: error.message,
      });
    }
  }
);

router.put(
  "/status/:applicationId",
  protect,
  authorize("company"),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { status } = req.body;

      if (
        status !== "CompanyApproved" &&
        status !== "CompanyRejected"
      ) {
        return res.status(400).json({
          status: "error",
          message: "Status must be CompanyApproved or CompanyRejected",
        });
      }

      const application = await Application.findById(applicationId);

      if (!application) {
        return res.status(404).json({
          status: "error",
          message: "Application not found",
        });
      }

      if (String(application.company) !== String(req.user.id)) {
        return res.status(403).json({
          status: "error",
          message: "You can only process applications for your own company",
        });
      }

      if (application.status !== "Pending") {
        return res.status(400).json({
          status: "error",
          message: "This application has already been processed",
        });
      }

      application.status = status;

      if (status === "CompanyApproved") {
        await application.populate([
          { path: "student", select: "name" },
          { path: "company", select: "companyName" },
          { path: "internship", select: "title" },
        ]);

        const studentName = application.student?.name || "Student";
        const companyName = application.company?.companyName || "Company";
        const internshipTitle = application.internship?.title || "Internship";
        const position = application.position || "Internship Position";

        application.confirmationLetter = {
          subject: "Internship Application Confirmation",
          message: `Dear ${studentName},
We are pleased to inform you that your application for the internship position "${position}" at ${companyName} has been approved by the company.
Internship: ${internshipTitle}
Your application has been successfully accepted by the company.
Please forward this confirmation letter to your college for verification and approval.
Regards,
${companyName}`,
          sentAt: new Date(),
        };
      }

      await application.save();
      if (status === "CompanyApproved") await notifyStudent(application.student._id, { type: "company_approval", message: `Your application for ${application.internship?.title || "an internship"} at ${application.company?.companyName || "the company"} was approved by the company`, relatedEntityId: application._id, target: "applications", eventKey: `company-approved:${application._id}` });

      res.status(200).json({
        status: "success",
        message:
          status === "CompanyApproved"
            ? "Application accepted by company. Confirmation letter sent to student. Waiting for college verification."
            : "Application rejected by company.",
        application,
      });
    } catch (error) {
      console.error("Update Application Status Error:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to update application status",
        error: error.message,
      });
    }
  }
);

router.put(
  "/company/:applicationId",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { companyId } = req.body;

      const application = await Application.findById(applicationId);

      if (!application) {
        return res.status(404).json({
          status: "error",
          message: "Application not found",
        });
      }

      const companyExists = await Company.findById(companyId);

      if (!companyExists) {
        return res.status(404).json({
          status: "error",
          message: "New company not found",
        });
      }

      application.company = companyId;
      await application.save();

      res.status(200).json({
        status: "success",
        message: "Application company updated successfully",
        application,
      });
    } catch (error) {
      console.error("Update Application Company Error:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to update application company",
        error: error.message,
      });
    }
  }
);

router.put(
  "/forward-to-college/:applicationId",
  protect,
  authorize("student"),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const application = await Application.findById(applicationId);

      if (!application) {
        return res.status(404).json({
          status: "error",
          message: "Application not found",
        });
      }

      if (String(application.student) !== String(req.user.id)) {
        return res.status(403).json({
          status: "error",
          message: "You can only forward your own application",
        });
      }

      if (application.status !== "CompanyApproved") {
        return res.status(400).json({
          status: "error",
          message: "Only company-approved applications can be forwarded to college",
        });
      }

      if (!application.confirmationLetter?.message) {
        return res.status(400).json({
          status: "error",
          message: "Confirmation letter is not available yet",
        });
      }

      if (application.forwardedToCollege) {
        return res.status(400).json({
          status: "error",
          message: "Confirmation letter has already been forwarded to college",
        });
      }

      application.forwardedToCollege = true;
      application.forwardedAt = new Date();

      await application.save();
      try {
        const [student, internship] = await Promise.all([Student.findById(application.student).select("name department college"), Internship.findById(application.internship).select("title")]);
        await notifyCollege(student?.college, { type: "application_for_college", message: `${student?.name || "A student"} (${student?.department || "department unavailable"}) forwarded ${internship?.title || "an internship application"} for college approval`, relatedEntityId: application._id, target: "applications", eventKey: `college-review:${application._id}` });
      } catch (notificationError) { console.error("College application notification skipped:", notificationError.message); }

      res.status(200).json({
        status: "success",
        message: "Confirmation letter forwarded to college successfully",
        application,
      });
    } catch (error) {
      console.error("Forward Confirmation Letter Error:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to forward confirmation letter to college",
      });
    }
  }
);

router.get(
  "/student/:studentId",
  protect,
  authorize("student"),
  async (req, res) => {
    try {
      const { studentId } = req.params;

      if (String(req.user.id) !== String(studentId)) {
        return res.status(403).json({
          status: "error",
          message: "You can only view your own applications",
        });
      }

      const applications = await Application.find({
        student: studentId,
      })
        .populate(
          "company",
          "companyName email location description"
        )
        .populate(
          "internship",
          "title description location duration eligibility skillsRequired deadline"
        )
        .populate(
          "faculty",
          "name email department phone designation"
        )
        .sort({ createdAt: -1 });

      res.status(200).json({
        status: "success",
        applications,
      });
    } catch (error) {
      console.error("Fetch Student Applications Error:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch student applications",
        error: error.message,
      });
    }
  }
);

module.exports = router;
