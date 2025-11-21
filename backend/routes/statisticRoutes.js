// routes/statisticRoutes.js
const express = require('express');
const router = express.Router();
const statisticController = require('../controllers/StatisticController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Vai trò được phép xem thống kê/báo cáo
const adminStaffRoles = ['Admin', 'ThuThu'];

// =================== A. DASHBOARD (Tổng quan) ===================

// Lấy tổng quan các chỉ số chính
router.get('/dashboard', authenticateToken, authorizeRoles(adminStaffRoles), statisticController.getDashboardStats);

// =================== B. BÁO CÁO CHI TIẾT ===================

// Báo cáo sách được mượn nhiều nhất
router.get('/report/top-borrowed', authenticateToken, authorizeRoles(adminStaffRoles), statisticController.getTopBorrowedBooks);

// Báo cáo doanh thu theo tháng
router.get('/report/revenue-by-month', authenticateToken, authorizeRoles(adminStaffRoles), statisticController.getMonthlyRevenue);

// Báo cáo tình trạng tồn kho theo danh mục
router.get('/report/inventory', authenticateToken, authorizeRoles(adminStaffRoles), statisticController.getInventoryReport);

module.exports = router;