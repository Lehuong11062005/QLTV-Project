// backend/config/emailConfig.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// 1. Lấy thông tin và cắt khoảng trắng thừa (Trim)
const emailUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : '';

// 2. Kiểm tra xem có thiếu cấu hình không
if (!emailUser || !emailPass) {
    console.error("❌ LỖI: Thiếu cấu hình EMAIL_USER hoặc EMAIL_PASS trong file .env");
}

// 3. Tạo Transporter (Người vận chuyển)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass
    }
});

// 4. Kiểm tra kết nối ngay khi khởi động server (Optional)
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Lỗi kết nối Email Server:", error.message);
    } else {
        console.log("✅ Kết nối Email Server thành công! Sẵn sàng gửi mail.");
    }
});

module.exports = transporter;