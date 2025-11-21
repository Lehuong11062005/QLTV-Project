// src/services/authService.js
import api from "./api";

const API_AUTH_URL = "/api/auth";

const authService = {
    // === CÁC HÀM XÁC THỰC CƠ BẢN ===
    _loginApi: (data) => api.post(`${API_AUTH_URL}/login`, data),
    
    login: async (data) => {
        const response = await authService._loginApi(data);
        const { token, user } = response.data;
        if (token) {
            localStorage.setItem("token", token);
            localStorage.setItem("userInfo", JSON.stringify(user));
        }
        return response.data; 
    },
    
    register: (data) => api.post(`${API_AUTH_URL}/register`, data),
    
    logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userRole"); 
        localStorage.removeItem("userInfo");
        return Promise.resolve({ message: "Đăng xuất thành công" });
    },
    
    // === HÀM KÍCH HOẠT VÀ XÁC MINH ===
    activateAccount: (data) => api.post(`${API_AUTH_URL}/activate`, data),
    
    verify: () => {
        const token = localStorage.getItem("token");
        if (!token) return Promise.reject(new Error("No token"));
        return Promise.resolve({ data: { valid: true } }); 
    },

    // === HÀM QUÊN/ĐẶT LẠI MẬT KHẨU ===
    /**
     * @description Gửi yêu cầu đặt lại mật khẩu bằng cách nhập email.
     * @param {object} data - Chứa trường tenDangNhap (Email của người dùng).
     */
    forgotPassword: (data) => {
        // ✅ SỬA: Dùng forgotPassword thay vì requestPasswordReset
        return api.post(`${API_AUTH_URL}/forgot-password`, data);
    },
    
    /**
     * @description Gửi yêu cầu đặt lại mật khẩu mới sau khi xác minh token.
     * @param {object} data - Chứa { token: string, newPassword: string }.
     * @returns {Promise<object>} - Trả về { message: string }.
     */
    resetPassword: (data) => {
        return api.post(`${API_AUTH_URL}/reset-password`, data);
    },
    
    // === HÀM PROFILE VÀ CẬP NHẬT ===
    getProfile: () => {
        return api.get(`${API_AUTH_URL}/profile`)
            .catch((error) => {
                console.warn("Get Profile API lỗi, sử dụng dữ liệu từ localStorage");
                const userInfo = localStorage.getItem("userInfo");
                if (userInfo) {
                    return Promise.resolve({ data: JSON.parse(userInfo) });
                }
                return Promise.reject(error);
            });
    },
    
    updateProfile: (data) => {
        return api.put(`${API_AUTH_URL}/profile`, data);
    },
    
    changePassword: (data) => {
        return api.put(`${API_AUTH_URL}/change-password`, data)
            .catch((error) => {
                return Promise.reject(new Error("Chức năng đổi mật khẩu chưa khả dụng"));
            });
    }
};

// --------------------------------------------------------------------------------
// XUẤT (EXPORT) CÁC HÀM CỤ THỂ
// --------------------------------------------------------------------------------

export const { 
    login,
    register,
    logout,
    verify,
    getProfile,
    updateProfile,
    changePassword,
    activateAccount,
    // ✅ SỬA: Export forgotPassword thay vì requestPasswordReset
    forgotPassword,
    resetPassword,
} = authService;

export default authService;