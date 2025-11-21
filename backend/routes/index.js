const express = require('express');
const router = express.Router();
// ✅ Đăng ký các route con với tiền tố tương ứng=> đây là index.js trong routes
router.use('/books', require('./bookRoutes'));
router.use('/Payment', require('./paymentRoutes'));
router.use('/borrow', require('./borrowRoutes'));
router.use('/return', require('./returnRoutes'));

// === SỬA DÒNG NÀY ===
router.use('/stats', require('./statisticRoutes')); // Đổi '/statistics' thành '/stats'
router.use('/cart', require('./cartRoutes'));
router.use('/orders', require('./orderRoutes'));
router.use('/auth', require('./authRoutes'));
router.use('/user', require('./userRoutes'));
router.use('/Feedback', require('./feedbackRoutes'));
router.use('/book-status', require('./bookStatusRoutes'));

router.get('/test', (req, res) => res.json({ message: 'API hoạt động bình thường 🚀' }));

module.exports = router;