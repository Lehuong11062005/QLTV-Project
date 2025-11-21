import api from "./api"; 

// BASE URL cho nghiệp vụ Đơn Hàng Mua
const API_ORDER_URL = "/api/orders";

const orderService = {
    // ================================================================================
    // 👥 CHỨC NĂNG ĐỘC GIẢ (Client Actions)
    // ================================================================================

    /**
     * @description Tạo đơn hàng mới từ giỏ hàng (Checkout).
     * API: POST /api/orders/checkout
     */
    createOrder: (data) => api.post(`${API_ORDER_URL}/checkout`, data),

    /**
     * @description Lấy lịch sử đơn hàng mua của độc giả.
     * API: GET /api/orders/history
     */
    getOrders: (params) => api.get(`${API_ORDER_URL}/history`, { params }), 

    /**
     * @description Lấy chi tiết của một đơn hàng (User View).
     * API: GET /api/orders/history/{MaDH}
     */
    getOrderDetail: (id) => api.get(`${API_ORDER_URL}/history/${id}`), 

    // ================================================================================
    // 🔑 CHỨC NĂNG ADMIN/THỦ THƯ (Management Actions)
    // ================================================================================

    /**
     * @description Lấy tất cả đơn hàng mua (Admin View).
     * API: GET /api/orders/admin/all
     */
    getAllOrdersAdmin: (params) => api.get(`${API_ORDER_URL}/admin/all`, { params }),
    
    /**
     * @description Lấy chi tiết đơn hàng (Admin View - Có thông tin người mua).
     * API: GET /api/orders/admin/{MaDH}
     */
    getOrderDetailAdmin: (id) => api.get(`${API_ORDER_URL}/admin/${id}`), // ✅ BỔ SUNG HÀM NÀY

    /**
     * @description Cập nhật trạng thái đơn hàng mua (Admin: Chờ duyệt, Đang giao...).
     * API: PUT /api/orders/admin/{MaDH}/status
     */
    updateOrderStatus: (id, data) => api.put(`${API_ORDER_URL}/admin/${id}/status`, data),
};

// Export từng hàm để có thể destructuring
export const {
    createOrder,
    getOrders,
    getOrderDetail,
    getAllOrdersAdmin,
    getOrderDetailAdmin, // ✅ NHỚ EXPORT Ở ĐÂY
    updateOrderStatus,
} = orderService;

export default orderService;