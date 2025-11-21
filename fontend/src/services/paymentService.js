// src/services/paymentService.js
import api from "./api";

const API_PAYMENT_URL = "/api/payment";

const paymentService = {
    // ================================================================================
    // 💳 CHỨC NĂNG CỔNG THANH TOÁN (MOMO)
    // ================================================================================

    /**
     * @description Tạo URL thanh toán MoMo.
     * @param {Object} data { loaiGiaoDich: 'DonHang'|'PhiPhat', referenceId: '...', amount: ... }
     * API: POST /api/payment/create-url
     */
    createPaymentUrl: (data) => api.post(`${API_PAYMENT_URL}/create-url`, data),

    // ================================================================================
    // 📊 CHỨC NĂNG QUẢN LÝ GIAO DỊCH (ADMIN)
    // ================================================================================

    /**
     * @description Lấy lịch sử tất cả giao dịch (Dành cho Admin).
     * API: GET /api/payment/history
     */
    getTransactionList: () => api.get(`${API_PAYMENT_URL}/history`),

    /**
     * @description Cập nhật trạng thái giao dịch thủ công.
     * API: PUT /api/payment/update-status
     */
    updateTransactionStatus: (maTT, trangThai) => api.put(`${API_PAYMENT_URL}/update-status`, { maTT, trangThai }),

    // ================================================================================
    // 👤 CHỨC NĂNG CÁ NHÂN (USER) - ⭐️ PHẦN ĐANG BỊ THIẾU
    // ================================================================================

    /**
     * @description Lấy lịch sử giao dịch CỦA TÔI (Dành cho User đang đăng nhập).
     * API: GET /api/payment/my-history
     */
    getMyTransactions: () => api.get(`${API_PAYMENT_URL}/my-history`),
};

// Export các hàm dưới dạng Named Exports để import { ... } hoạt động
export const {
    createPaymentUrl,
    getTransactionList,
    updateTransactionStatus,
    getMyTransactions // ✅ Đã thêm hàm này
} = paymentService;

export default paymentService;