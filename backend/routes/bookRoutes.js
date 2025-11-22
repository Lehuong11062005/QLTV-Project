// src/routes/bookRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinaryConfig'); // 👈 BẮT BUỘC: Import cấu hình upload

// Import các hàm từ Controller
const { 
    searchBooks, 
    getAllBooksAdmin, 
    getBookMetadata,
    getSachById, 
    createBook, 
    updateBook, 
    deleteBook 
} = require('../controllers/bookController');

const { authenticateToken } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// ============================================================
// 1. CÁC ROUTE TĨNH (GET)
// ============================================================

router.get('/search', searchBooks);
router.get('/metadata', authenticateToken, adminMiddleware, getBookMetadata);
router.get('/admin', authenticateToken, adminMiddleware, getAllBooksAdmin);

// ============================================================
// 2. CÁC ROUTE ĐỘNG & CRUD (CÓ UPLOAD ẢNH)
// ============================================================

// Thêm sách: Thêm upload.single('AnhMinhHoa') để xử lý file
router.post('/', 
    authenticateToken, 
    adminMiddleware, 
    upload.single('AnhMinhHoa'), 
    createBook
);

// Cập nhật sách: Cũng cần upload để hỗ trợ đổi ảnh bìa
router.put('/:id', 
    authenticateToken, 
    adminMiddleware, 
    upload.single('AnhMinhHoa'), 
    updateBook
);

// Xóa sách
router.delete('/:id', authenticateToken, adminMiddleware, deleteBook);

// Xem chi tiết (Đặt cuối cùng)
router.get('/:MaSach', getSachById);

module.exports = router;