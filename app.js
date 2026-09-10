const express = require("express");
const cors = require("cors");
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


const connectDB = require("./config/db");

const app = express();

// =====================================================
// CONNECT DATABASE
// =====================================================

connectDB();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(express.json());

// =====================================================
// ROUTES
// =====================================================

app.use(
  "/api/students",
  studentRoutes
);

app.use(
  "/api/applications",
  applicationRoutes
);

app.use(
  "/api/companies",
  companyRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/admin-login",
  adminLoginRoutes
);

app.use(
  "/api/internships",
  internshipRoutes
);

app.use(
  "/api/faculty",
  facultyRoutes
);

app.use(
  "/api/internship-assignments",
  internshipAssignmentRoutes
);

app.use("/api/company-guides", companyGuideRoutes);

// =====================================================
// TEST ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.send(
    "Interlink Backend is Running!"
  );
});

// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT}`
  );
});