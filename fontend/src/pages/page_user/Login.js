import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../../services/authService"; 
import "./Login.css";

export default function Login() {
    const [formData, setFormData] = useState({
        TenDangNhap: "",
        MatKhau: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError(null);
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        // 1. Client-side Validation
        if (!formData.TenDangNhap.trim() || !formData.MatKhau.trim()) {
            setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log("Starting login process...");
            
            // 2. Gọi API đăng nhập - authService.login đã trả về response.data
            const responseData = await login({
                tenDangNhap: formData.TenDangNhap.trim(),
                matKhau: formData.MatKhau
            });

            console.log("Login response data:", responseData);

            const { token, user, message } = responseData;

            if (!token) {
                throw new Error("Đăng nhập thất bại. Không nhận được token từ server.");
            }

            console.log("Login successful, user data:", user);

            // 3. Token và user info đã được lưu tự động trong authService.login
            // Chỉ cần lưu userRole
            localStorage.setItem("userRole", user.LoaiTK);

            // 4. Điều hướng theo vai trò
            if (user.LoaiTK === "Admin" || user.LoaiTK === "ThuThu") {
                navigate("/admin/dashboard");
            } else {
                navigate("/books");
            }

        } catch (error) {
            console.error("Login error details:", error);
            
            // 5. Xử lý lỗi và cleanup
            if (isMounted.current) {
                // Gọi logout để clear tất cả storage
                localStorage.removeItem("token");
                localStorage.removeItem("userRole");
                localStorage.removeItem("userInfo");

                let errorMessage = "Có lỗi xảy ra khi đăng nhập!";

                if (error.response) {
                    const serverError = error.response.data;
                    
                    if (error.response.status === 400) {
                        errorMessage = serverError.message || "Vui lòng nhập đầy đủ thông tin!";
                    } else if (error.response.status === 401) {
                        errorMessage = "Tên đăng nhập hoặc mật khẩu không đúng!";
                    } else if (error.response.status === 403) {
                        errorMessage = serverError.message || "Tài khoản bị khóa, vui lòng liên hệ quản trị viên!";
                    } else if (serverError && serverError.message) {
                        errorMessage = serverError.message;
                    } else {
                        errorMessage = `Lỗi server: ${error.response.status}`;
                    }
                } else if (error.request) {
                    errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng!";
                } else if (error.message) {
                    errorMessage = error.message;
                }

                setError(errorMessage);
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="login-title">
                    🔐 Đăng Nhập
                </h2>

                <form onSubmit={handleLogin}>
                    {/* Error Message */}
                    {error && (
                        <div className="message error-message">
                            ⚠️ {error}
                        </div>
                    )}
                    
                    {/* Username Field */}
                    <div className="form-group">
                        <label className="input-label">
                            Tên đăng nhập *
                        </label>
                        <input
                            type="text"
                            name="TenDangNhap"
                            value={formData.TenDangNhap}
                            onChange={handleChange}
                            placeholder="Nhập email của bạn"
                            disabled={loading}
                            className="input-field"
                            autoComplete="username"
                        />
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label className="input-label">
                            Mật khẩu *
                        </label>
                        <input
                            type="password"
                            name="MatKhau"
                            value={formData.MatKhau}
                            onChange={handleChange}
                            placeholder="Nhập mật khẩu của bạn"
                            disabled={loading}
                            className="input-field"
                            autoComplete="current-password"
                        />
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`login-button ${loading ? 'loading' : ''}`}
                    >
                        {loading ? (
                            <span className="spinner-container">
                                <div className="spinner"></div>
                                Đang đăng nhập...
                            </span>
                        ) : (
                            "🚀 Đăng Nhập"
                        )}
                    </button>

                    {/* Links Section */}
                    <div className="links-section">
                        <Link 
                            to="/forgot-password" 
                            className="forgot-password-link"
                        >
                            🔑 Quên mật khẩu?
                        </Link>
                        
                        <div className="register-link-section">
                            <span className="register-link-text">
                                Chưa có tài khoản?{" "}
                                <Link 
                                    to="/register" 
                                    className="register-link"
                                >
                                    📝 Đăng ký ngay
                                </Link>
                            </span>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}