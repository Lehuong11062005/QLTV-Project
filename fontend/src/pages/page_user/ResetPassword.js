import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
// Giả định hàm resetPassword đã được thêm và export trong authService
// import { resetPassword } from '../../services/authService'; 
import './Login.css'; // Dùng lại CSS của Login

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // 1. Lấy token từ URL (Bắt buộc phải có)
    const token = searchParams.get('token'); 

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [isTokenValid, setIsTokenValid] = useState(!!token); // Kiểm tra token ban đầu

    // 2. Kiểm tra token khi component mount
    useEffect(() => {
        if (!token) {
            setError('Không tìm thấy token. Vui lòng sử dụng liên kết đầy đủ từ email.');
            setIsTokenValid(false);
        } else {
            // TẠM THỜI: Trong hệ thống thực, bạn nên có một API GET /verify-reset-token 
            // để kiểm tra token có còn hạn không trước khi hiển thị form.
            // Ở đây, ta dựa vào POST API để kiểm tra.
        }
    }, [token]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError(null);
        if (message) setMessage(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 3. Client-side Validation
        if (!isTokenValid) {
            setError('Token không hợp lệ hoặc đã bị thiếu.');
            return;
        }
        if (passwordData.newPassword.length < 8) {
            setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 4. GỌI API ĐẶT LẠI MẬT KHẨU
            // const response = await resetPassword({ 
            //     token: token, 
            //     newPassword: passwordData.newPassword 
            // });

            // --- TẠM THỜI MÔ PHỎNG API (Sau này thay bằng code trên) ---
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            const response = { data: { message: 'Đặt lại mật khẩu thành công!' } };
            // --- KẾT THÚC MÔ PHỎNG ---

            setMessage(response.data.message);
            
            // 5. Điều hướng về trang đăng nhập sau khi thành công
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            // Xử lý lỗi từ Backend (400: Token hết hạn/không hợp lệ)
            const errorMessage = err.response?.data?.message || 'Lỗi: Không thể đặt lại mật khẩu.';
            setError(errorMessage);
            setIsTokenValid(false); // Token bị lỗi, chặn gửi lại
        } finally {
            setLoading(false);
        }
    };

    if (!isTokenValid && !error) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <h2 className="login-title" style={{ fontSize: '24px', color: '#ff4d4f' }}>
                        ❌ Đang tải...
                    </h2>
                    <p style={{ textAlign: 'center', color: '#666' }}>
                        Đang chờ kiểm tra token.
                    </p>
                </div>
            </div>
        );
    }
    
    // UI chính
    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-divider"></div>
                
                <h2 className="login-title" style={{ fontSize: '24px' }}>
                    🔐 Đặt Lại Mật Khẩu
                </h2>

                <form onSubmit={handleSubmit}>
                    
                    {/* Message Box */}
                    {message && <div className="message success-message">{message}</div>}
                    {error && <div className="message error-message">⚠️ {error}</div>}
                    
                    {/* Cảnh báo token */}
                    {isTokenValid && !message && (
                         <div className="message success-message" style={{ background: '#fffbe6', color: '#d97706' }}>
                             Token đã nhận. Vui lòng nhập mật khẩu mới.
                         </div>
                    )}


                    {/* Password Field */}
                    <div className="form-group">
                        <label className="input-label">Mật khẩu mới *</label>
                        <input
                            type="password"
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handleChange}
                            placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)"
                            disabled={loading}
                            className="input-field"
                        />
                    </div>

                    {/* Confirm Password Field */}
                    <div className="form-group">
                        <label className="input-label">Xác nhận mật khẩu *</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Nhập lại mật khẩu mới"
                            disabled={loading}
                            className="input-field"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`login-button ${loading ? 'loading' : ''}`}
                        style={{ background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                        {loading ? (
                            <span className="spinner-container">
                                <div className="spinner"></div>
                                Đang đặt lại...
                            </span>
                        ) : (
                            "Hoàn tất Đặt lại"
                        )}
                    </button>
                    
                    {/* Back to Login Link */}
                    <div className="register-link-section" style={{ marginTop: '15px' }}>
                        <Link to="/login" className="register-link">
                            Quay lại Đăng nhập
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}