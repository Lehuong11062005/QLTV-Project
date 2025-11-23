// src/services/bookManagementService.js
import api from "./api"; 

const API_URL = "/api/books";
const META_URL = "/api/metadata"; // Đường dẫn mới cho Metadata

// 1. Lấy danh sách sách (Admin)
export const getBooksAdmin = () => {
    return api.get(`${API_URL}/admin`);
};

// 2. Lấy dữ liệu phụ trợ (Tác giả, Danh mục)
export const getBookMetadata = () => {
    // API này (getMetadata) có thể nằm ở bookController cũ hoặc metadataController mới
    // Tùy bạn route bên backend, ở đây tôi giả định bạn vẫn dùng route cũ
    // Nếu bạn đã chuyển sang metadataController, hãy đổi thành: api.get(`${META_URL}`);
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

// --- 👇 MỚI: CÁC HÀM THÊM NHANH ---

// 6. Thêm nhanh Tác giả
export const createAuthorQuick = (data) => {
    return api.post(`${META_URL}/author`, data);
};

// 7. Thêm nhanh Danh mục
export const createCategoryQuick = (data) => {
    return api.post(`${META_URL}/category`, data);
};