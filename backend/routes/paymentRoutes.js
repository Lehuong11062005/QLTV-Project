// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require("../controllers/paymentController");
// Đảm bảo đường dẫn import middleware đúng với cấu trúc thư mục của bạn
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");

// ==================================================================
// 1. PUBLIC ROUTES (Quan trọng cho luồng thanh toán)
// ==================================================================

// Tạo link thanh toán (Người dùng phải đăng nhập mới được tạo)
router.post('/create-url', authenticateToken, authorizeRoles(['DocGia']), paymentController.createPaymentUrl);

// Webhook IPN: MoMo gọi ngầm vào đây để báo kết quả (Bắt buộc Public - POST)
router.post('/momo-ipn', paymentController.handleMomoCallback);

// 👇 THÊM DÒNG NÀY: Xử lý Redirect từ MoMo về (Bắt buộc Public - GET) 👇
// Khi thanh toán xong, MoMo chuyển hướng người dùng về link này, 
// sau đó Controller sẽ đá tiếp về Frontend.
router.get('/payment-result', paymentController.checkPaymentResult);


// ==================================================================
// 2. ADMIN ROUTES (Quản lý lịch sử giao dịch)
// ==================================================================
router.get('/history', authenticateToken, authorizeRoles(['Admin', 'ThuThu']), paymentController.getTransactionList);
router.put('/update-status', authenticateToken, authorizeRoles(['Admin', 'ThuThu']), paymentController.updateTransactionStatus);


// ==================================================================
// 3. USER ROUTES (Lịch sử cá nhân)
// ==================================================================
router.get('/my-history', authenticateToken, authorizeRoles(['DocGia']), paymentController.getMyTransactions);

module.exports = router;