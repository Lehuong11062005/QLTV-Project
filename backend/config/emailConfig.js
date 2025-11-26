// backend/config/emailConfig.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const emailUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : '';

if (!emailUser || !emailPass) {
    console.error("❌ LỖI: Thiếu cấu hình EMAIL_USER hoặc EMAIL_PASS");
}

// SỬA ĐOẠN NÀY: Dùng cấu hình thủ công thay vì service: 'gmail'
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,              // Port 587 (TLS) hoạt động ổn định nhất trên Cloud
    secure: false,          // false cho port 587 (true chỉ cho port 465)
    auth: {
        user: emailUser,
        pass: emailPass
    },
    tls: {
        rejectUnauthorized: false // Giúp tránh lỗi SSL certificate trên server ảo
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Lỗi kết nối Email Server:", error.message);
    } else {
        console.log("✅ Kết nối Email Server thành công! Sẵn sàng gửi mail.");
    }
});

module.exports = transporter;