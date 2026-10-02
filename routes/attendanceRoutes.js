const express = require("express");
const router = express.Router();

const Attendance = require("../models/Attendance");
const InternshipAssignment = require("../models/InternshipAssignment");

/*
=========================================================
HELPER
Calculate hours from check-in and check-out
=========================================================
*/

const calculateHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const [inHour, inMinute] = checkIn.split(":").map(Number);
  const [outHour, outMinute] = checkOut.split(":").map(Number);

  if (
    Number.isNaN(inHour) ||
    Number.isNaN(inMinute) ||
    Number.isNaN(outHour) ||
    Number.isNaN(outMinute)
  ) {
    return 0;
  }

  const checkInMinutes =
    inHour * 60 + inMinute;

  const checkOutMinutes =
    outHour * 60 + outMinute;

  let difference =
    checkOutMinutes - checkInMinutes;

  /*
    If checkout is accidentally earlier than
    check-in, don't allow negative hours.
  */
  if (difference < 0) {
    return 0;
  }

  return Number((difference / 60).toFixed(2));
};

/*
=========================================================
1. COMPANY GUIDE - MARK ATTENDANCE
=========================================================

POST
/api/attendance/company-guide/mark
*/

router.post(
  "/company-guide/mark",
  async (req, res) => {
    try {
      const {
        assignmentId,
        companyGuideId,
        date,
        status,
        checkIn,
        checkOut,
        workDescription,
      } = req.body;

      if (
        !assignmentId ||
        !companyGuideId ||
        !date ||
        !status
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Assignment, company guide, date and status are required",
        });
      }

      /*
      Find internship assignment
      */
      const assignment =
        await InternshipAssignment.findById(
          assignmentId
        );

      if (!assignment) {
        return res.status(404).json({
          status: "error",
          message: "Internship assignment not found",
        });
      }

      /*
      Make sure this company guide is actually
      assigned to this internship.
      */
      if (
        !assignment.companyGuide ||
        assignment.companyGuide.toString() !==
          companyGuideId.toString()
      ) {
        return res.status(403).json({
          status: "error",
          message:
            "This company guide is not assigned to this internship",
        });
      }

      /*
      Attendance should only be marked for an
      active internship.
      */
      if (
        assignment.status !== "Active" &&
        assignment.status !== "Assigned"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Attendance cannot be marked for this internship",
        });
      }

      /*
      Calculate hours only for Present / Half Day.
      */
      let totalHours = 0;

      if (
        status === "Present" ||
        status === "Half Day"
      ) {
        totalHours = calculateHours(
          checkIn,
          checkOut
        );
      }

      /*
      Absent should always have zero hours.
      */
      if (status === "Absent") {
        totalHours = 0;
      }

      /*
      Check duplicate attendance.
      */
      const attendanceDate = new Date(date);

      const existingAttendance =
        await Attendance.findOne({
          assignment: assignmentId,
          student: assignment.student,
          date: attendanceDate,
        });

      if (existingAttendance) {
        return res.status(400).json({
          status: "error",
          message:
            "Attendance has already been marked for this date",
        });
      }

      /*
      Create attendance record.
      */
      const attendance =
        await Attendance.create({
          assignment: assignmentId,
          student: assignment.student,
          faculty:
            assignment.facultyGuide,
          companyGuide: companyGuideId,
          date: attendanceDate,
          status,
          checkIn:
            status === "Absent"
              ? ""
              : checkIn || "",
          checkOut:
            status === "Absent"
              ? ""
              : checkOut || "",
          totalHours,
          workDescription:
            workDescription || "",
          verificationStatus: "Pending",
        });

      res.status(201).json({
        status: "success",
        message:
          "Attendance marked successfully",
        attendance,
      });
    } catch (error) {
      console.error(
        "Mark Attendance Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to mark attendance",
      });
    }
  }
);

/*
=========================================================
2. COMPANY GUIDE - VIEW ATTENDANCE
=========================================================

GET
/api/attendance/company-guide/:assignmentId
*/

router.get(
  "/company-guide/:assignmentId",
  async (req, res) => {
    try {
      const { assignmentId } =
        req.params;

      const attendance =
        await Attendance.find({
          assignment: assignmentId,
        })
          .populate(
            "student",
            "name registerNumber department"
          )
          .populate(
            "faculty",
            "name email department"
          )
          .sort({ date: -1 });

      res.status(200).json({
        status: "success",
        attendance,
      });
    } catch (error) {
      console.error(
        "Get Company Attendance Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to fetch attendance",
      });
    }
  }
);

/*
=========================================================
3. COMPANY GUIDE - EDIT ATTENDANCE
=========================================================

PUT
/api/attendance/company-guide/:attendanceId
*/

router.put(
  "/company-guide/:attendanceId",
  async (req, res) => {
    try {
      const { attendanceId } =
        req.params;

      const {
        status,
        checkIn,
        checkOut,
        workDescription,
      } = req.body;

      const attendance =
        await Attendance.findById(
          attendanceId
        );

      if (!attendance) {
        return res.status(404).json({
          status: "error",
          message:
            "Attendance record not found",
        });
      }

      /*
      Do not allow editing after faculty
      has already approved the record.
      */
      if (
        attendance.verificationStatus ===
        "Approved"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Approved attendance cannot be edited",
        });
      }

      let totalHours = 0;

      if (
        status === "Present" ||
        status === "Half Day"
      ) {
        totalHours = calculateHours(
          checkIn,
          checkOut
        );
      }

      if (status === "Absent") {
        totalHours = 0;
      }

      attendance.status =
        status || attendance.status;

      attendance.checkIn =
        status === "Absent"
          ? ""
          : checkIn || "";

      attendance.checkOut =
        status === "Absent"
          ? ""
          : checkOut || "";

      attendance.totalHours =
        totalHours;

      attendance.workDescription =
        workDescription || "";

      /*
      Editing sends it back to faculty
      for verification.
      */
      attendance.verificationStatus =
        "Pending";

      attendance.facultyComment = "";

      attendance.verifiedAt = null;

      await attendance.save();

      res.status(200).json({
        status: "success",
        message:
          "Attendance updated successfully",
        attendance,
      });
    } catch (error) {
      console.error(
        "Update Attendance Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to update attendance",
      });
    }
  }
);

/*
=========================================================
4. FACULTY - VIEW ATTENDANCE
=========================================================

GET
/api/attendance/faculty/:assignmentId
*/

router.get(
  "/faculty/:assignmentId",
  async (req, res) => {
    try {
      const { assignmentId } =
        req.params;

      const assignment =
        await InternshipAssignment.findById(
          assignmentId
        );

      if (!assignment) {
        return res.status(404).json({
          status: "error",
          message:
            "Internship assignment not found",
        });
      }

      const attendance =
        await Attendance.find({
          assignment: assignmentId,
        })
          .populate(
            "student",
            "name registerNumber department"
          )
          .populate(
            "faculty",
            "name email department"
          )
          .sort({ date: -1 });

      res.status(200).json({
        status: "success",
        attendance,
      });
    } catch (error) {
      console.error(
        "Get Faculty Attendance Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to fetch attendance",
      });
    }
  }
);

/*
=========================================================
5. FACULTY - VERIFY ATTENDANCE
=========================================================

PUT
/api/attendance/faculty/:attendanceId/verify
*/

router.put(
  "/faculty/:attendanceId/verify",
  async (req, res) => {
    try {
      const { attendanceId } =
        req.params;

      const {
        verificationStatus,
        facultyComment,
      } = req.body;

      if (
        verificationStatus !==
          "Approved" &&
        verificationStatus !==
          "Rejected"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Verification status must be Approved or Rejected",
        });
      }

      const attendance =
        await Attendance.findById(
          attendanceId
        );

      if (!attendance) {
        return res.status(404).json({
          status: "error",
          message:
            "Attendance record not found",
        });
      }

      attendance.verificationStatus =
        verificationStatus;

      attendance.facultyComment =
        facultyComment || "";

      attendance.verifiedAt =
        new Date();

      await attendance.save();

      res.status(200).json({
        status: "success",
        message:
          verificationStatus ===
          "Approved"
            ? "Attendance approved successfully"
            : "Attendance rejected successfully",
        attendance,
      });
    } catch (error) {
      console.error(
        "Verify Attendance Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to verify attendance",
      });
    }
  }
);

/*
=========================================================
6. STUDENT - VIEW ATTENDANCE
=========================================================

GET
/api/attendance/student/:assignmentId
*/

router.get(
  "/student/:assignmentId",
  async (req, res) => {
    try {
      const { assignmentId } =
        req.params;

      const attendance =
        await Attendance.find({
          assignment: assignmentId,
          verificationStatus: "Approved",
        }).sort({ date: -1 });

      const totalHours =
        attendance.reduce(
          (total, record) =>
            total +
            (record.totalHours || 0),
          0
        );

      res.status(200).json({
        status: "success",
        attendance,
        totalHours: Number(
          totalHours.toFixed(2)
        ),
      });
    } catch (error) {
      console.error(
        "Get Student Attendance Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to fetch student attendance",
      });
    }
  }
);

/*
=========================================================
7. ATTENDANCE SUMMARY
=========================================================

GET
/api/attendance/summary/:assignmentId
*/

router.get(
  "/summary/:assignmentId",
  async (req, res) => {
    try {
      const { assignmentId } =
        req.params;

      const records =
        await Attendance.find({
          assignment: assignmentId,
        });

      const presentDays =
        records.filter(
          (record) =>
            record.status ===
            "Present"
        ).length;

      const absentDays =
        records.filter(
          (record) =>
            record.status ===
            "Absent"
        ).length;

      const halfDays =
        records.filter(
          (record) =>
            record.status ===
            "Half Day"
        ).length;

      const approvedHours =
        records
          .filter(
            (record) =>
              record.verificationStatus ===
              "Approved"
          )
          .reduce(
            (total, record) =>
              total +
              (record.totalHours || 0),
            0
          );

      const pendingHours =
        records
          .filter(
            (record) =>
              record.verificationStatus ===
              "Pending"
          )
          .reduce(
            (total, record) =>
              total +
              (record.totalHours || 0),
            0
          );

      res.status(200).json({
        status: "success",
        summary: {
          totalDays: records.length,
          presentDays,
          absentDays,
          halfDays,
          approvedHours: Number(
            approvedHours.toFixed(2)
          ),
          pendingHours: Number(
            pendingHours.toFixed(2)
          ),
        },
      });
    } catch (error) {
      console.error(
        "Attendance Summary Error:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Failed to calculate attendance summary",
      });
    }
  }
);

module.exports = router;