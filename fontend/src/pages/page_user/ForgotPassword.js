import React, { useState } from 'react';
import { Link } from 'react-router-dom';
// ✅ SỬA: Import đúng hàm forgotPassword từ authService
import { forgotPassword } from '../../services/authService'; 
import "./ForgotPassword.css"; // ✅ SỬA: Dùng CSS riêng

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email.trim()) {
            setError('Vui lòng nhập địa chỉ email của bạn.');
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            // ✅ BƯỚC 1: GỌI API GỬI LINK ĐẶT LẠI MẬT KHẨU
            // Dữ liệu gửi đi: { tenDangNhap: email }
            const response = await forgotPassword({ tenDangNhap: email.trim() }); 

            // ✅ BƯỚC 2: XỬ LÝ KẾT QUẢ
            setMessage(response.data?.message || `✅ Yêu cầu đã được gửi! Vui lòng kiểm tra hộp thư email (${email}) để nhận hướng dẫn đặt lại mật khẩu.`);
            
        } catch (err) {
            console.error('Forgot password error:', err);
            
            // ✅ BƯỚC 3: XỬ LÝ LỖI
            let errorMessage = 'Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại.';
            
            if (err.response) {
                // Lỗi từ server (4xx, 5xx)
                errorMessage = err.response.data?.message || errorMessage;
            } else if (err.request) {
                // Không nhận được response từ server
                errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
            } else {
                // Lỗi khác
                errorMessage = err.message || errorMessage;
            }
            
            setError(`⚠️ ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <div className="forgot-password-divider"></div>
                
                <h2 className="forgot-password-title">
                    🔑 Quên Mật Khẩu?
                </h2>
                
                <p className="forgot-password-intro">
                    Nhập email đã đăng ký của bạn. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
                </p>

                <form onSubmit={handleSubmit}>
                    
                    {/* Message Box */}
                    {message && <div className="message success-message">{message}</div>}
                    {error && <div className="message error-message">{error}</div>}

                    {/* Email Field */}
                    <div className="form-group">
                        <label className="input-label">Email đăng ký *</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) setError(null);
                                if (message) setMessage(null);
                            }}
                            placeholder="Ví dụ: email@domain.com"
                            disabled={loading}
                            className="input-field"
                            autoComplete="email" 
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`forgot-password-button ${loading ? 'loading' : ''}`}
                    >
                        {loading ? (
                            <span className="spinner-container">
                                <div className="spinner"></div>
                                Đang gửi yêu cầu...
                            </span>
                        ) : (
                            "📧 Gửi Yêu Cầu Đặt Lại"
                        )}
                    </button>
                    
                    {/* Links Section */}
                    <div className="links-section">
                        <Link to="/login" className="back-link">
                            ↩️ Quay lại Đăng nhập
                        </Link>
                        
                        <div className="register-link-section">
                            <span className="register-link-text">
                                Chưa có tài khoản?{" "}
                                <Link to="/register" className="register-link">
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