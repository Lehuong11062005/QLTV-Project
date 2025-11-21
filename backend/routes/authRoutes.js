// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ✅ ĐÃ SỬA: Import đúng hàm 'authenticateToken' từ file 'authMiddleware.js'
const { authenticateToken } = require('../middleware/authMiddleware'); 

// Route không cần xác thực
router.post('/register', authController.register);
router.post('/login', authController.login);
// ✅ BỔ SUNG: Yêu cầu gửi email đặt lại mật khẩu
router.post('/forgot-password', authController.forgotPassword); 

// ✅ BỔ SUNG: Xử lý đặt lại mật khẩu (Sau khi nhấp vào link email)
router.post('/reset-password', authController.resetPassword);
// --- Các route cần xác thực --- 
// hàm 
router.post('/activate', authController.activateAccount);
// ✅ ĐÃ THÊM: Route GET /profile (để lấy thông tin user)
router.get('/profile', authenticateToken, authController.getProfile);

// ✅ ĐÃ THÊM: Route PUT /profile (để cập nhật thông tin user)
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;