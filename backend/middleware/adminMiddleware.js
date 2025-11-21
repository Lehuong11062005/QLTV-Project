// src/middleware/adminMiddleware.js

// Lấy hàm ủy quyền authorizeRoles từ authMiddleware đã cung cấp
const { authorizeRoles } = require('./authMiddleware'); 

/**
 * @description Middleware kiểm tra quyền truy cập Admin/Thủ thư.
 * Chỉ cho phép vai trò 'Admin' hoặc 'ThuThu' truy cập.
 * Nó dựa vào thông tin vai trò (req.user.role) đã được gắn từ authenticateToken.
 */
const adminMiddleware = authorizeRoles(['Admin', 'ThuThu']);

module.exports = adminMiddleware;