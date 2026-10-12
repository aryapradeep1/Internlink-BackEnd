const assert = require("node:assert/strict");
const {
  isInternshipComplete,
  updateAssignmentCompletion,
} = require("../utils/internshipCompletion");

const approved = { facultyStatus: "Approved", hoursWorked: 30 };
const pending = { facultyStatus: "Pending", hoursWorked: 30 };
const rejected = { facultyStatus: "Rejected", hoursWorked: 30 };

assert.equal(isInternshipComplete(60, "60 hours", [approved, pending]), false);
assert.equal(isInternshipComplete(60, "60 hours", [approved, approved]), true);
assert.equal(isInternshipComplete(60, "60 hours", [approved, rejected]), false);
assert.equal(isInternshipComplete(59, "60 hours", [approved, approved]), false);
assert.equal(isInternshipComplete(60, "60 hours", []), false);

async function verifyFinalApprovalCompletesAssignment() {
  const assignment = {
    status: "Assigned",
    save: async function save() {},
  };

  await updateAssignmentCompletion(assignment, "60 hours", [approved, pending]);
  assert.notEqual(assignment.status, "Completed");

  await updateAssignmentCompletion(assignment, "60 hours", [approved, approved]);
  assert.equal(assignment.status, "Completed");

  await updateAssignmentCompletion(assignment, "60 hours", [approved, rejected]);
  assert.notEqual(assignment.status, "Completed");
}

verifyFinalApprovalCompletesAssignment().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
