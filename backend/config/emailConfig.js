const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER?.trim(),
        pass: process.env.EMAIL_PASS?.trim()  // App Password (16 ký tự)
    }
});

// Kiểm tra kết nối
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Lỗi Email Server:", error.message);
    } else {
        console.log("✅ Gmail SMTP hoạt động ổn định!");
    }
});

module.exports = transporter;
