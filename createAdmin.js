const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Admin = require("./models/Admin");

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = new Admin({
      name: "Admin",
      email: "admin@internlink.com",
      password: hashedPassword,
    });

    await admin.save();

    console.log("Admin created successfully!");
    console.log("Email: admin@internlink.com");
    console.log("Password: admin123");

    process.exit();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

createAdmin();