import axios from "axios";

// --------------------------------------------------------------------------
// SỬA Ở ĐÂY: Tự động lấy link API từ biến môi trường
// Nếu không có biến môi trường (lúc chạy ở nhà), nó sẽ dùng localhost:5000
// --------------------------------------------------------------------------
const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Lưu ý: Nếu bạn dùng Vite (file cấu hình là vite.config.js), hãy bỏ comment dòng dưới và xóa dòng trên:
// const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000"; 

const api = axios.create({
  baseURL: apiUrl, // Đã thay thế chuỗi cứng bằng biến
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.url.includes('/api/auth/register') && !config.url.includes('/api/auth/login')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      // Tốt nhất nên dùng navigate hoặc window.location.origin để tránh lỗi path
      window.location.href = "/login"; 
    }
    return Promise.reject(err);
  }
);

export default api;