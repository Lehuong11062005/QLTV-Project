const express = require("express");
const router = express.Router();

const {
    createOrder,
    getOrders,
    getOrderDetail,
    getAllOrdersAdmin,
    getOrderDetailAdmin, // ✅ BỔ SUNG: Import hàm này
    updateOrderStatus
} = require("../controllers/orderController");

const { authenticateToken } = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// ============================================================
// 🟢 ĐỘC GIẢ (USER)
// ============================================================

// Tạo đơn hàng
router.post("/checkout", authenticateToken, createOrder);

// Lấy lịch sử đơn hàng
router.get("/history", authenticateToken, getOrders);

// Xem chi tiết đơn hàng (Chỉ xem được đơn của chính mình)
router.get("/history/:MaDH", authenticateToken, getOrderDetail);


// ============================================================
// 🔴 ADMIN (QUẢN LÝ)
// ============================================================

// Lấy tất cả đơn hàng
router.get("/admin/all", authenticateToken, adminMiddleware, getAllOrdersAdmin);

// Xem chi tiết đơn hàng bất kỳ (Bao gồm thông tin người mua)
// ✅ BỔ SUNG: Route này để phục vụ trang AdminPurchaseOrders
router.get("/admin/:MaDH", authenticateToken, adminMiddleware, getOrderDetailAdmin);

// Cập nhật trạng thái đơn hàng
router.put("/admin/:MaDH/status", authenticateToken, adminMiddleware, updateOrderStatus);

module.exports = router;