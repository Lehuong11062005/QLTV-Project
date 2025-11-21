const express = require("express");
const router = express.Router();

// 👇 BẠN ĐANG THIẾU getActiveBorrows Ở DÒNG DƯỚI ĐÂY
const { 
    returnBook, 
    getAllReturns, 
    getReturnDetail,
    getActiveBorrows // <--- THÊM DÒNG NÀY VÀO
} = require("../controllers/returnController");

const { authenticateToken } = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// --- CÁC ROUTE ---

// Dòng này sẽ hết lỗi sau khi bạn thêm import ở trên
router.get("/active", authenticateToken, adminMiddleware, getActiveBorrows); 

router.post("/", authenticateToken, adminMiddleware, returnBook);
router.get("/history", authenticateToken, adminMiddleware, getAllReturns);
router.get("/detail/:maTra", authenticateToken, adminMiddleware, getReturnDetail);

module.exports = router;