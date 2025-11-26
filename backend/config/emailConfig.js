const nodemailer = require('nodemailer');
require('dotenv').config();

// CẤU HÌNH CHUẨN CHO RENDER (Copy đè lên code cũ)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,              // Cổng 587 (TLS) là cổng chuẩn quốc tế, không bị chặn
    secure: false,          // Bắt buộc là false khi dùng port 587
    auth: {
        user: process.env.EMAIL_USER?.trim(),
        pass: process.env.EMAIL_PASS?.trim()
    },
    tls: {
        rejectUnauthorized: false // Giúp bỏ qua các lỗi bảo mật mạng khắt khe trên Cloud
    }
});

// Kiểm tra kết nối
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Lỗi kết nối Email Server:", error.message);
    } else {
        console.log("✅ Kết nối Email Server thành công! Sẵn sàng gửi mail.");
    }
});

module.exports = transporter;