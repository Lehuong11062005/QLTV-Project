// backend/config/emailConfig.js
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid'); // Thư viện mới vừa cài
require('dotenv').config();

// Kiểm tra xem đã có API Key chưa
if (!process.env.SENDGRID_API_KEY) {
    console.error("❌ LỖI: Thiếu SENDGRID_API_KEY. Hãy kiểm tra biến môi trường.");
}

const options = {
    apiKey: process.env.SENDGRID_API_KEY
};

// Tạo transporter sử dụng giao thức API của SendGrid (Không lo bị chặn Port)
const transporter = nodemailer.createTransport(sgTransport(options));

console.log("✅ Cấu hình Email: Đang sử dụng SendGrid API.");

module.exports = transporter;