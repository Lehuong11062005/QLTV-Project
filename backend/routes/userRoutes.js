// routes/userRoutes.js
const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController'); 
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const adminStaffRoles = ['Admin', 'ThuThu'];


// ============================================================
// A. QUẢN LÝ ĐỘC GIẢ (CRUD - Dành cho Admin/Thủ thư)
// ============================================================

// GET /api/user/docgia: Lấy danh sách tất cả độc giả
router.get('/docgia', authenticateToken, authorizeRoles(adminStaffRoles), userController.getAllDocGia);

// ⭐️ THÊM MỚI: POST /api/user/docgia: Thêm độc giả mới (cho UserManagement)
router.post('/docgia', authenticateToken, authorizeRoles(adminStaffRoles), userController.addDocGia);

// GET /api/user/docgia/:MaDG: Lấy thông tin độc giả theo ID
router.get('/docgia/:MaDG', authenticateToken, authorizeRoles(adminStaffRoles), userController.getDocGiaById);

// PUT /api/user/docgia/:MaDG: Cập nhật thông tin độc giả (Chỉnh sửa Admin)
router.put('/docgia/:MaDG', authenticateToken, authorizeRoles(adminStaffRoles), userController.updateDocGia);

// ⭐️ THÊM MỚI: PUT /api/user/docgia/:MaDG/status: Cập nhật trạng thái thẻ (Khóa/Mở)
router.put('/docgia/:MaDG/status', authenticateToken, authorizeRoles(adminStaffRoles), userController.updateDocGiaStatus);

// ============================================================
// B. QUẢN LÝ THỦ THƯ (CRUD - Chủ yếu dành cho Admin)
// ============================================================

// GET /api/user/thuthu: Lấy danh sách tất cả thủ thư
router.get('/thuthu', authenticateToken, authorizeRoles(adminStaffRoles), userController.getAllThuThu);

// POST /api/user/thuthu: Thêm thủ thư/Admin mới
router.post('/thuthu', authenticateToken, authorizeRoles(adminStaffRoles), userController.addThuThu);

// PUT /api/user/thuthu/:MaTT: Cập nhật thông tin thủ thư/Admin
router.put('/thuthu/:MaTT', authenticateToken, authorizeRoles(adminStaffRoles), userController.updateThuThu);

// ⭐️ THÊM MỚI: DELETE /api/user/thuthu/:MaTT: Xóa thủ thư/Admin
router.delete('/thuthu/:MaTT', authenticateToken, authorizeRoles(adminStaffRoles), userController.deleteThuThu);





module.exports = router;