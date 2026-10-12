const Notification = require("../models/Notification");
const Admin = require("../models/Admin");
const CollegeAdmin = require("../models/CollegeAdmin");
const Student = require("../models/Student");
const InternshipAssignment = require("../models/InternshipAssignment");

async function notifyUser(data) {
  try {
    if (!data?.recipientId || !data?.recipientRole || !data?.eventKey) return;
    await Notification.updateOne(
      { recipientId: data.recipientId, recipientRole: data.recipientRole, eventKey: data.eventKey },
      { $setOnInsert: { ...data, read: false } },
      { upsert: true }
    );
  } catch (error) { console.error("Notification creation failed:", error.message); }
}

async function notifyAdmins(data) {
  try {
    const admins = await Admin.find({}).select("_id").lean();
    await Promise.all(admins.map(admin => notifyUser({ ...data, recipientId: admin._id, recipientRole: "admin" })));
  } catch (error) { console.error("Admin notification failed:", error.message); }
}

async function notifyCollege(collegeId, data) {
  try {
    const recipients = [];
    if (collegeId) recipients.push({ recipientId: collegeId, recipientRole: "college" });
    const admins = await CollegeAdmin.find({ college: collegeId, status: "Active" }).select("_id").lean();
    recipients.push(...admins.map(admin => ({ recipientId: admin._id, recipientRole: "collegeAdmin" })));
    await Promise.all(recipients.map(recipient => notifyUser({ ...data, ...recipient, eventKey: data.eventKey + ":" + recipient.recipientId })));
  } catch (error) { console.error("College notification failed:", error.message); }
}

async function notifyStudent(studentId, data) {
  return notifyUser({ ...data, recipientId: studentId, recipientRole: "student" });
}

async function notifyCompany(companyId, data) {
  return notifyUser({ ...data, recipientId: companyId, recipientRole: "company" });
}

async function notifyEligibleStudents(internship) {
  try {
    if (internship.status !== "Open" || (internship.deadline && new Date(internship.deadline) <= new Date())) return;
    const eligibility = String(internship.eligibility || "").trim().toLowerCase();
    const students = await Student.find({}).select("_id department").lean();
    const eligible = students.filter(student => {
      if (!eligibility || /\b(all|any|all departments|any department)\b/.test(eligibility)) return true;
      return Boolean(student.department && eligibility.includes(String(student.department).toLowerCase()));
    });
    await Promise.all(eligible.map(student => notifyStudent(student._id, {
      type: "internship_posted", message: "New eligible internship: " + internship.title + " at " + (internship.company?.companyName || "a company"),
      relatedEntityId: internship._id, target: "internships", eventKey: "internship-posted:" + internship._id,
    })));
  } catch (error) { console.error("Eligible student notification failed:", error.message); }
}

module.exports = { notifyUser, notifyAdmins, notifyCollege, notifyStudent, notifyCompany, notifyEligibleStudents };
