// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Tất cả routes đều yêu cầu xác thực và chỉ dành cho độc giả
router.use(authenticateToken);
router.use(authorizeRoles(['DocGia']));

// ================================================================================
// 🛒 GIỎ MƯỢN SÁCH (LOAN CART) ROUTES
// ================================================================================

// Lấy giỏ mượn
router.get('/loan', cartController.getLoanCart);

// Thêm sách vào giỏ mượn
router.post('/loan/add', cartController.addToLoanCart);

// Cập nhật số lượng sách trong giỏ mượn
router.put('/loan/update', cartController.updateLoanCartItem);

// Xóa sách khỏi giỏ mượn
router.delete('/loan/remove/:maSach', cartController.removeFromLoanCart);

// Xóa toàn bộ giỏ mượn
router.delete('/loan/clear', cartController.clearLoanCart);

// ================================================================================
// 🛍️ GIỎ MUA SÁCH (PURCHASE CART) ROUTES
// ================================================================================

// Lấy giỏ mua
router.get('/purchase', cartController.getPurchaseCart);

// Thêm sách vào giỏ mua
router.post('/purchase/add', cartController.addToPurchaseCart);

// Cập nhật số lượng sách trong giỏ mua
router.put('/purchase/update', cartController.updatePurchaseCartItem);

// Xóa sách khỏi giỏ mua
router.delete('/purchase/remove/:maSach', cartController.removeFromPurchaseCart);

// Xóa toàn bộ giỏ mua
router.delete('/purchase/clear', cartController.clearPurchaseCart);

module.exports = router;