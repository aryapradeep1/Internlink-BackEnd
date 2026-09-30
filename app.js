const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const studentRoutes = require("./routes/studentRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const companyRoutes = require("./routes/companyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminLoginRoutes = require("./routes/adminLoginRoutes");
const internshipRoutes = require("./routes/internshipRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const internshipAssignmentRoutes = require("./routes/internshipAssignmentRoutes");
const companyGuideRoutes = require("./routes/companyGuideRoutes");
const collegeRoutes = require("./routes/collegeRoutes");
const collegeAdminRoutes = require("./routes/collegeAdminRoutes");
const logbookRoutes = require("./routes/logbookRoutes");
const authRoutes = require("./routes/authRoutes");

const connectDB = require("./config/db");

const app = express();

connectDB();

/* =========================================================
   CORS
========================================================= */

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json());
app.use(cookieParser());

/* =========================================================
   STATIC FILES
========================================================= */

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* =========================================================
   API ROUTES
========================================================= */

app.use("/api/students", studentRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin-login", adminLoginRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/internship-assignments", internshipAssignmentRoutes);
app.use("/api/company-guides", companyGuideRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/college-admin", collegeAdminRoutes);
app.use("/api/logbook", logbookRoutes);
app.use("/api/auth", authRoutes);
/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {
  res.send("Interlink Backend is Running!");
});

/* =========================================================
   SERVER
========================================================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});