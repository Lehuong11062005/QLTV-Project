// 👇 QUAN TRỌNG: Phải import api từ file cấu hình axios
import api from "./api"; 

// Base URL khớp với route backend (src/routes/bookRoutes.js)
const API_URL = "/api/books";

// 1. Lấy danh sách tất cả sách (Dành cho Admin - hiển thị dạng bảng)
export const getBooksAdmin = () => {
    return api.get(`${API_URL}/admin`);
};

// 2. Lấy dữ liệu phụ trợ (Danh sách Tác giả, Danh mục) để nạp vào Dropdown
export const getBookMetadata = () => {
    return api.get(`${API_URL}/metadata`);
};

// 3. Thêm sách mới
export const createBook = (data) => {
    // data là object chứa: tenSach, maTG, maDM, giaBan, soLuongTon...
    return api.post(`${API_URL}`, data);
};

// 4. Cập nhật thông tin sách
export const updateBook = (maSach, data) => {
    return api.put(`${API_URL}/${maSach}`, data);
};

// 5. Xóa sách
export const deleteBook = (maSach) => {
    return api.delete(`${API_URL}/${maSach}`);
};

// 6. Cập nhật nhanh trạng thái
export const updateBookStatus = (maSach, status) => {
    return api.put(`${API_URL}/status/${maSach}`, { status });
};