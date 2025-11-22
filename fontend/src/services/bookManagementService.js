// src/services/bookManagementService.js
import api from "./api"; 

const API_URL = "/api/books";

// 1. Lấy danh sách sách (Admin)
export const getBooksAdmin = () => {
    return api.get(`${API_URL}/admin`);
};

// 2. Lấy dữ liệu phụ trợ (Tác giả, Danh mục)
export const getBookMetadata = () => {
    return api.get(`${API_URL}/metadata`);
};

// 3. Thêm sách mới (CÓ FILE ẢNH -> Dùng FormData)
export const createBook = (formData) => {
    return api.post(`${API_URL}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

// 4. Cập nhật sách (CÓ FILE ẢNH -> Dùng FormData)
export const updateBook = (maSach, formData) => {
    return api.put(`${API_URL}/${maSach}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

// 5. Xóa sách
export const deleteBook = (maSach) => {
    return api.delete(`${API_URL}/${maSach}`);
};