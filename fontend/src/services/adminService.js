// src/services/adminService.js
// Chức năng quản trị tổng hợp (CRUD Sách, User, Reports)
import api from "./api"; // Giả định đã cấu hình baseURL: 'http://localhost:5000'

// Khai báo các URL cơ sở
const API_USER_URL = "/api/user";     
const API_STATS_URL = "/api/stats";   

// --- 1. DASHBOARD & TỔNG QUAN (Dashboard.js) ---
export const getDashboardSummary = () => {
    // GET /api/stats/dashboard
    return api.get(`${API_STATS_URL}/dashboard`); 
};

// ---------------------------------------------------------
// --- 1. QUẢN LÝ NHÂN VIÊN (StaffManagement.js) ---
// Tên hàm đã được sửa để phù hợp với controllers/userController.js
// ---------------------------------------------------------

/** Lấy danh sách Thủ thư/Admin */
export const getAllThuThu = (params) => {
    // GET /api/user/thuthu
    return api.get(`${API_USER_URL}/thuthu`, { params });
};

/** Thêm Thủ thư/Admin mới */
export const addThuThu = (data) => {
    // POST /api/user/thuthu
    return api.post(`${API_USER_URL}/thuthu`, data);
};

/** Cập nhật thông tin Thủ thư/Admin */
export const updateThuThu = (staffId, data) => {
    // PUT /api/user/thuthu/:staffId
    return api.put(`${API_USER_URL}/thuthu/${staffId}`, data);
};

/** Xóa Thủ thư/Admin */
export const deleteThuThu = (staffId) => {
    // DELETE /api/user/thuthu/:staffId
    return api.delete(`${API_USER_URL}/thuthu/${staffId}`);
};

// ---------------------------------------------------------
// --- . QUẢN LÝ NGƯỜI DÙNG (UserManagement.js) ---
// Tên hàm đã được sửa để phù hợp với controllers/userController.js
// ---------------------------------------------------------

/** Lấy danh sách Độc giả */
export const getAllDocGia = (params) => {
    // GET /api/user/docgia
    return api.get(`${API_USER_URL}/docgia`, { params });
};

/** Thêm Độc giả mới */
export const addDocGia = (data) => {
    // POST /api/user/docgia
    return api.post(`${API_USER_URL}/docgia`, data);
};

/** Cập nhật thông tin Độc giả */
export const updateDocGia = (userId, data) => {
    // PUT /api/user/docgia/:userId
    return api.put(`${API_USER_URL}/docgia/${userId}`, data);
};

/** Cập nhật trạng thái thẻ/tài khoản Độc giả */
export const updateDocGiaStatus = (userId, data) => {
    // PUT /api/user/docgia/:userId/status, body: { TrangThaiThe: 'Hoạt động'/'Khóa' }
    return api.put(`${API_USER_URL}/docgia/${userId}/status`, data); // Sửa data: truyền nguyên object { TrangThaiThe: status } từ UI
};
