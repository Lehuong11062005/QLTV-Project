import api from "./api";

const API_RETURN_URL = "/api/return";
const API_BORROW_URL = "/api/borrow"; 

const returnService = {
    // ============================================================
    // 🔄 NGHIỆP VỤ XỬ LÝ TRẢ SÁCH (Action)
    // ============================================================

    /**
     * @description Tìm kiếm phiếu mượn để thực hiện trả (Admin).
     * Gọi API lấy chi tiết phiếu mượn của Admin.
     */
    searchBorrowForReturn: (keyword) => {
        // API: GET /api/borrow/admin/orders/{keyword}
        return api.get(`${API_BORROW_URL}/admin/orders/${keyword}`);
    },

    /**
     * @description Thực hiện trả sách và tính phạt.
     * API: POST /api/return
     */
    returnBook: (data) => {
        return api.post(`${API_RETURN_URL}`, data);
    },

    // ============================================================
    // 📜 NGHIỆP VỤ DANH SÁCH & LỌC (View List)
    // ============================================================

    /**
     * @description Lấy danh sách tất cả phiếu mượn đang hoạt động (Đang mượn + Quá hạn).
     * Dùng cho giao diện list/chọn phiếu mặc định.
     * API: GET /api/borrow/admin/orders?status=active&search=...
     * * 🔥 FIX SYNTAX ERROR TẠI ĐÂY (Dùng Concise Method)
     */
    getActiveBorrowOrdersList(searchKeyword = '') { 
        return api.get(`${API_BORROW_URL}/admin/orders`, {
            params: {
                status: 'active', // Lọc trạng thái Đang mượn / Quá hạn
                search: searchKeyword // Truyền từ khóa tìm kiếm lên server
            }
        });
    },

    // ============================================================
    // 📜 NGHIỆP VỤ LỊCH SỬ & BÁO CÁO (View)
    // ============================================================

    /**
     * @description Lấy danh sách tất cả lịch sử trả sách.
     * API: GET /api/return/history
     */
    getAllReturns: () => {
        return api.get(`${API_RETURN_URL}/history`);
    },

    /**
     * @description Lấy chi tiết các cuốn sách trong 1 phiếu trả.
     * API: GET /api/return/detail/{maTra}
     */
    getReturnDetail: (maTra) => {
        return api.get(`${API_RETURN_URL}/detail/${maTra}`);
    }
};

// 🔥 QUAN TRỌNG: Phải export từng hàm ra để component có thể import { ... }
export const {
    searchBorrowForReturn,
    returnBook,
    getAllReturns,
    getReturnDetail,
    getActiveBorrowOrdersList
} = returnService;

export default returnService;