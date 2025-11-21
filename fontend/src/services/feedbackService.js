import api from "./api";

// Base URL chuẩn (chữ thường)
const API_FEEDBACK_URL = "/api/feedback"; 

const feedbackService = {
  // =================================================
  // 🟢 DÀNH CHO ĐỘC GIẢ
  // =================================================

  /**
   * @description Gửi phản hồi mới
   * API: POST /api/feedback
   */
  sendFeedback: (data) => {
      // data: { noiDung: "..." }
      return api.post(`${API_FEEDBACK_URL}`, data);
  },
  
  /**
   * @description Lấy lịch sử phản hồi của tôi
   * API: GET /api/feedback/my-history
   */
  getMyFeedbacks: () => {
      return api.get(`${API_FEEDBACK_URL}/my-history`);
  },
  
  // =================================================
  // 🔴 DÀNH CHO ADMIN
  // =================================================

  /**
   * @description Lấy tất cả phản hồi (có lọc status)
   * API: GET /api/feedback/admin
   */
  getAllFeedbacks: (params) => {
      return api.get(`${API_FEEDBACK_URL}/admin`, { params });
  },
  
  /**
   * @description Cập nhật trạng thái phản hồi
   * API: PUT /api/feedback/admin/:maPH/status
   */
  updateFeedbackStatus: (maPH, status) => {
      // 🔥 QUAN TRỌNG: Gửi key 'trangThai' (camelCase) để khớp với Controller backend
      return api.put(`${API_FEEDBACK_URL}/admin/${maPH}/status`, { trangThai: status });
  },
};

// Xuất các hàm để dùng kiểu destructuring
export const {
  sendFeedback,
  getMyFeedbacks,
  getAllFeedbacks,
  updateFeedbackStatus
} = feedbackService;

export default feedbackService;