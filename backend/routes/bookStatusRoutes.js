const express = require('express');
const router = express.Router();
const { 
    getCopiesByBook, 
    generateCopies, 
    updateCopyStatus, 
    deleteCopy 
} = require('../controllers/bookStatusController');
const { authenticateToken } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Base path: /api/book-status (Sẽ config ở index.js)

// Lấy danh sách bản sao của 1 sách
router.get('/:maSach', authenticateToken, adminMiddleware, getCopiesByBook);

// Nhập thêm bản sao (Generate)
router.post('/generate', authenticateToken, adminMiddleware, generateCopies);

// Cập nhật trạng thái 1 bản sao
router.put('/:maBanSao', authenticateToken, adminMiddleware, updateCopyStatus);

// Xóa 1 bản sao
router.delete('/:maBanSao', authenticateToken, adminMiddleware, deleteCopy);

module.exports = router;