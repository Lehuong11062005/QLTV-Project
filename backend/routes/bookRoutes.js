const express = require('express');
const router = express.Router();

// Import chính xác các tên hàm từ file Controller "xịn" của bạn
const { 
    searchBooks, 
    getAllBooksAdmin, 
    getBookMetadata,
    getSachById, 
    createBook, 
    updateBook, 
    deleteBook 
} = require('../controllers/bookController');

// Import Middleware (giữ nguyên như bạn đang dùng)
const { authenticateToken } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// ============================================================
// 1. CÁC ROUTE TĨNH (BẮT BUỘC ĐẶT TRÊN CÙNG)
// ============================================================

// Tìm kiếm sách (Public - Trang chủ/Danh sách sách)
// GET /api/books/search?search=...&page=1
router.get('/search', searchBooks);

// Lấy dữ liệu phụ trợ (Tác giả, Danh mục) cho Dropdown (Admin)
// GET /api/books/metadata -> Khắc phục lỗi 404 metadata
router.get('/metadata', authenticateToken, adminMiddleware, getBookMetadata);

// Lấy danh sách quản trị dạng bảng (Admin)
// GET /api/books/admin -> Khắc phục lỗi 404 admin
router.get('/admin', authenticateToken, adminMiddleware, getAllBooksAdmin);


// ============================================================
// 2. CÁC ROUTE ĐỘNG (CÓ THAM SỐ :ID - ĐẶT XUỐNG DƯỚI)
// ============================================================

// Xem chi tiết sách (Public)
// GET /api/books/S001
// ⚠️ Nếu đặt route này lên đầu, chữ "admin" sẽ bị hiểu là một :MaSach -> Gây lỗi
router.get('/:MaSach', getSachById);

// Thêm sách mới (Admin)
// POST /api/books
router.post('/', authenticateToken, adminMiddleware, createBook);

// Cập nhật sách (Admin)
// PUT /api/books/S001
router.put('/:id', authenticateToken, adminMiddleware, updateBook);

// Xóa sách (Admin)
// DELETE /api/books/S001
router.delete('/:id', authenticateToken, adminMiddleware, deleteBook);

module.exports = router;