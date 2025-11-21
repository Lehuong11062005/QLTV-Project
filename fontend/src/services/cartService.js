// src/services/cartService.js
import api from "./api";

const API_CART_URL = "/api/cart";

const cartService = {
  // --- LOAN CART ---
  getLoanCart: () => api.get(`${API_CART_URL}/loan`),
  
  // data ở đây sẽ là { MaSach: "...", SoLuong: 1 }
  addToLoanCart: (data) => api.post(`${API_CART_URL}/loan/add`, data),
  
  updateLoanCartItem: (maSach, soLuong) => 
    api.put(`${API_CART_URL}/loan/update`, { MaSach: maSach, SoLuong: soLuong }),
  
  removeFromLoanCart: (maSach) => 
    api.delete(`${API_CART_URL}/loan/remove/${maSach}`),
  
  clearLoanCart: () => api.delete(`${API_CART_URL}/loan/clear`),

  // --- PURCHASE CART ---
  getPurchaseCart: () => api.get(`${API_CART_URL}/purchase`),
  
  addToPurchaseCart: (data) => api.post(`${API_CART_URL}/purchase/add`, data),
  
  updatePurchaseCartItem: (maSach, soLuong) => 
    api.put(`${API_CART_URL}/purchase/update`, { MaSach: maSach, SoLuong: soLuong }),
  
  removeFromPurchaseCart: (maSach) => 
    api.delete(`${API_CART_URL}/purchase/remove/${maSach}`),
  
  clearPurchaseCart: () => api.delete(`${API_CART_URL}/purchase/clear`),
};

export const {
  getLoanCart, addToLoanCart, updateLoanCartItem, removeFromLoanCart, clearLoanCart,
  getPurchaseCart, addToPurchaseCart, updatePurchaseCartItem, removeFromPurchaseCart, clearPurchaseCart
} = cartService;

export default cartService;