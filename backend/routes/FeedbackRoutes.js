const express = require("express");
const router = express.Router();

// Import Controller
const { 
    submitFeedback, 
    getMyFeedback, 
    getAllFeedbackAdmin, 
    updateFeedbackStatusAdmin 
} = require("../controllers/FeedbackController");

// Import Middleware
const { authenticateToken } = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// ============================================================
// 🟢 ĐỘC GIẢ (USER)
// ============================================================

// 1. Gửi phản hồi
// POST /api/feedback
router.post("/", authenticateToken, submitFeedback);

// 2. Xem lịch sử phản hồi của chính mình
// GET /api/feedback/my-history
router.get("/my-history", authenticateToken, getMyFeedback);


// ============================================================
// 🔴 ADMIN (QUẢN LÝ)
// ============================================================

// 3. Xem toàn bộ danh sách phản hồi (có lọc)
// GET /api/feedback/admin
router.get("/admin", authenticateToken, adminMiddleware, getAllFeedbackAdmin);

// 4. Cập nhật trạng thái (Duyệt/Xử lý xong)
// PUT /api/feedback/admin/:maPH/status
router.put("/admin/:maPH/status", authenticateToken, adminMiddleware, updateFeedbackStatusAdmin);

module.exports = router;