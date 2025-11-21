// src/routes/borrowRoutes.js
const express = require('express');
const router = express.Router();

const { 
    createBorrowOrder, 
    getBorrowHistory, 
    getBorrowDetail, 
    getAllBorrowOrders, 
    getBorrowOrderDetails, 
    approveBorrowOrder, 
    rejectBorrowOrder, 
    updateBorrowStatus 
} = require('../controllers/borrowController');

// 🔥 IMPORT ĐÚNG MIDDLEWARE
const { authenticateToken } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// --- 👥 ĐỘC GIẢ ---

router.post('/order', authenticateToken, createBorrowOrder);

router.get('/history', authenticateToken, getBorrowHistory);

router.get('/history/:maMuon', authenticateToken, getBorrowDetail);

// --- 🔑 ADMIN/THỦ THƯ ---

router.get('/admin/orders', authenticateToken, adminMiddleware, getAllBorrowOrders);

router.get('/admin/orders/:maMuon', authenticateToken, adminMiddleware, getBorrowOrderDetails);

router.post('/:maMuon/approve', authenticateToken, adminMiddleware, approveBorrowOrder);

router.post('/:maMuon/reject', authenticateToken, adminMiddleware, rejectBorrowOrder);

router.put('/:maMuon/status', authenticateToken, adminMiddleware, updateBorrowStatus);

module.exports = router;
