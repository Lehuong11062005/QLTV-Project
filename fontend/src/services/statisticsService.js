// src/services/statisticService.js
// (Sửa lại từ file statisticsService.js của bạn)

import api from "./api";

// Đổi thành '/api/stats' để khớp với 'statisticRoutes.js'
const API_STATS_URL = "/api/stats"; 

// Thêm các hàm khớp với controller và routes của bạn
const statisticService = {
  // GET /api/stats/report/top-borrowed
  getTopBorrowedBooks: () => api.get(`${API_STATS_URL}/report/top-borrowed`),

  // GET /api/stats/report/revenue-by-month
  getMonthlyRevenue: () => api.get(`${API_STATS_URL}/report/revenue-by-month`),

  // GET /api/stats/report/inventory
  getInventoryReport: () => api.get(`${API_STATS_URL}/report/inventory`),
};

// Export để component có thể sử dụng
export default statisticService;