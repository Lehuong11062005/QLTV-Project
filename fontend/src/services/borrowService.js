// src/services/borrowService.js
import api from "./api";

// BASE URL cho nghiệp vụ Mượn Sách
const API_BORROW_URL = "/api/borrow";

const borrowService = {
    // ================================================================================
    // 👥 CHỨC NĂNG ĐỘC GIẢ (Client Actions: Tạo, Xem)
    // ================================================================================
    
    /**
     * @description Tạo Phiếu Mượn mới từ Giỏ Mượn (Chuyển sang trạng thái ChoDuyet).
     * API: POST /api/borrow/order
     */
    createBorrowOrder: (data) => api.post(`${API_BORROW_URL}/order`, data),

    /**
     * @description Lấy lịch sử phiếu mượn của độc giả.
     * API: GET /api/borrow/history
     */
    getBorrowHistory: (params) => api.get(`${API_BORROW_URL}/history`, { params }),
    
    /**
     * @description Lấy chi tiết của một phiếu mượn cụ thể.
     * API: GET /api/borrow/history/{maMuon}
     */
    getBorrowDetail: (maMuon) => api.get(`${API_BORROW_URL}/history/${maMuon}`),

    // ================================================================================
    // 🔑 CHỨC NĂNG THỦ THƯ/ADMIN (Management & Approval Actions)
    // ================================================================================

    /**
     * @description Lấy tất cả phiếu mượn (Admin View).
     * API: GET /api/borrow/admin/orders
     */
    getAllBorrowOrders: (params) => api.get(`${API_BORROW_URL}/admin/orders`, { params }),

    /**
     * @description Lấy chi tiết phiếu mượn (Admin View - Dùng để duyệt/xử lý).
     * API: GET /api/borrow/admin/orders/{maMuon}
     */
    getBorrowOrderDetails: (maMuon) => api.get(`${API_BORROW_URL}/admin/orders/${maMuon}`),

    /**
     * @description Duyệt phiếu mượn (ChoDuyet -> DaDuyet), gán bản sao, giảm tồn kho.
     * API: POST /api/borrow/{maMuon}/approve
     */
    approveBorrowOrder: (maMuon, data) => api.post(`${API_BORROW_URL}/${maMuon}/approve`, data || {}),    
    /**
     * @description Từ chối phiếu mượn (ChoDuyet -> DaHuy).
     * API: POST /api/borrow/{maMuon}/reject
     */
    rejectBorrowOrder: (maMuon, data) => api.post(`${API_BORROW_URL}/${maMuon}/reject`, data || {}),
    /**
     * @description Cập nhật trạng thái phiếu mượn (Ví dụ: QuaHan, DaHuy).
     * API: PUT /api/borrow/{maMuon}/status
     */
    updateBorrowStatus: (maMuon, data) => api.put(`${API_BORROW_URL}/${maMuon}/status`, data),
};

export const { 
    createBorrowOrder,
    getBorrowHistory,
    getBorrowDetail,
    getAllBorrowOrders,
    getBorrowOrderDetails,
    approveBorrowOrder,
    rejectBorrowOrder,
    updateBorrowStatus
} = borrowService;

export default borrowService;