import api from "./api";

const API_URL = "/api/book-status";

export const getCopiesByBook = (maSach) => api.get(`${API_URL}/${maSach}`);

export const generateCopies = (data) => api.post(`${API_URL}/generate`, data);
// data: { maSach, soLuongNhap, viTriKe }

export const updateCopyStatus = (maBanSao, data) => api.put(`${API_URL}/${maBanSao}`, data);
// data: { trangThai, viTriKe }

export const deleteCopy = (maBanSao) => api.delete(`${API_URL}/${maBanSao}`);