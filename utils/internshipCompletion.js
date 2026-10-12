const Internship = require("../models/Internship");
const InternshipAssignment = require("../models/InternshipAssignment");
const Logbook = require("../models/Logbook");

function isInternshipComplete(totalHours, requiredHours, logbooks) {
  const parsedRequiredHours = parseFloat(requiredHours);

  return (
    Array.isArray(logbooks) &&
    logbooks.length > 0 &&
    Number.isFinite(parsedRequiredHours) &&
    parsedRequiredHours > 0 &&
    totalHours >= parsedRequiredHours &&
    logbooks.every((logbook) => logbook.facultyStatus === "Approved")
  );
}

async function updateAssignmentCompletion(
  assignment,
  requiredHours,
  logbooks
) {
  const totalHours = logbooks.reduce(
    (total, logbook) => total + Number(logbook.hoursWorked || 0),
    0
  );

  if (isInternshipComplete(totalHours, requiredHours, logbooks)) {
    assignment.status = "Completed";
  } else if (assignment.status === "Completed") {
    assignment.status = "Active";
  }

  await assignment.save();
  return assignment;
}

async function refreshAssignmentCompletion(studentId, internshipId) {
  const [assignment, internship, logbooks] = await Promise.all([
    InternshipAssignment.findOne({
      student: studentId,
      internship: internshipId,
    }),
    Internship.findById(internshipId),
    Logbook.find({
      student: studentId,
      internship: internshipId,
    }),
  ]);

  if (!assignment || !internship) {
    return assignment;
  }

  return updateAssignmentCompletion(
    assignment,
    60,
    logbooks
  );
}

module.exports = {
  isInternshipComplete,
  updateAssignmentCompletion,
  refreshAssignmentCompletion,
};
