
require("dotenv").config();

const sendEmail = require("./utils/sendEmail");

async function testEmail() {
  try {
    await sendEmail({
      to: process.env.EMAIL_USER,
      subject: "InternLink Email Test",
      text: "Your InternLink email configuration is working!",
    });

    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Email test failed:", error.message);
  }
}

testEmail();
