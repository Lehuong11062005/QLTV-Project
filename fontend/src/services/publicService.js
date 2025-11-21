// src/services/publicService.js - GIỮ NGUYÊN
import api from "./api";

const API_BOOK_URL = "/api/books";
const API_FEEDBACK_URL = "/api/feedback";

const publicService = {
  // 1. TÌM KIẾM/LỌC/LẤY TẤT CẢ SÁCH (API LINH HOẠT)
  searchBooks: (params) => api.get(`${API_BOOK_URL}/search`, { params }),

  // 2. LẤY CHI TIẾT MỘT CUỐN SÁCH
  getBookById: (id) => api.get(`${API_BOOK_URL}/sach/${id}`),

  // 3. LẤY DANH SÁCH TÁC GIẢ
  getAuthors: () => api.get(`${API_BOOK_URL}/tacgia`),

  // 4. LẤY DANH MỤC (THỂ LOẠI)
  getCategories: () => api.get(`${API_BOOK_URL}/danhmuc`),

  // 5. GỬI PHẢN HỒI (DÀNH CHO ĐỘC GIẢ)
  sendFeedback: (data) => api.post(`${API_FEEDBACK_URL}/submit`, data),

  // 6. LẤY LỊCH SỬ PHẢN HỒI CỦA ĐỘC GIẢ
  getFeedbackHistory: () => api.get(`${API_FEEDBACK_URL}/my`),
};

// Xuất named exports
export const {
  searchBooks, 
  getBookById,
  getAuthors,
  getCategories,
  sendFeedback,
  getFeedbackHistory,
} = publicService;

// Xuất mặc định
export default publicService;