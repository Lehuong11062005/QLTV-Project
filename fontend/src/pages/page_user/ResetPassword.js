import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
// Import hàm resetPassword từ file authService bạn đã cung cấp
import { resetPassword } from '../../services/authService'; 
import './Login.css'; // Sử dụng lại CSS của trang Login để đồng bộ giao diện

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // 1. Lấy token từ URL (ví dụ: /reset-password?token=xyz...)
    const token = searchParams.get('token'); 

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [isTokenValid, setIsTokenValid] = useState(!!token);

    // 2. Kiểm tra sơ bộ khi component mount
    useEffect(() => {
        if (!token) {
            setError('Đường dẫn không hợp lệ hoặc thiếu Token. Vui lòng kiểm tra lại email.');
            setIsTokenValid(false);
        }
    }, [token]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
        // Xóa thông báo lỗi khi người dùng bắt đầu nhập lại
        if (error) setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // --- VALIDATION CLIENT-SIDE ---
        if (!isTokenValid) {
            setError('Token không hợp lệ. Vui lòng yêu cầu cấp lại mật khẩu.');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            // --- GỌI API THỰC TẾ ---
            // Gọi hàm resetPassword từ authService
            const response = await resetPassword({ 
                token: token, 
                newPassword: passwordData.newPassword 
            });

            // Nếu thành công (Axios trả về response object, dữ liệu nằm trong response.data)
            const successMsg = response.data?.message || 'Đặt lại mật khẩu thành công!';
            setMessage(successMsg);
            
            // Tự động chuyển về trang đăng nhập sau 3 giây
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            console.error("Reset Password Error:", err);
            
            // Xử lý lỗi trả về từ Backend
            // Ưu tiên lấy message từ: err.response.data.message
            const errorMessage = err.response?.data?.message || 'Đã xảy ra lỗi khi đặt lại mật khẩu. Vui lòng thử lại.';
            
            setError(errorMessage);

            // Nếu lỗi là 400 (Token sai/hết hạn) hoặc 404, khóa form lại
            if (err.response && (err.response.status === 400 || err.response.status === 404)) {
                setIsTokenValid(false);
            }
        } finally {
            setLoading(false);
        }
    };

    // --- GIAO DIỆN (UI) ---
    return (
        <div className="login-container">
            <div className="login-card">
                {/* Tiêu đề */}
                <h2 className="login-title" style={{ fontSize: '24px' }}>
                    🔐 Đặt Lại Mật Khẩu
                </h2>
                
                <div className="login-divider"></div>

                <form onSubmit={handleSubmit}>
                    {/* Hiển thị thông báo Thành công */}
                    {message && (
                        <div className="message success-message" style={{ textAlign: 'center' }}>
                            ✅ {message}
                            <div style={{ fontSize: '0.9em', marginTop: '5px' }}>
                                Đang chuyển hướng về đăng nhập...
                            </div>
                        </div>
                    )}

                    {/* Hiển thị thông báo Lỗi */}
                    {error && (
                        <div className="message error-message" style={{ textAlign: 'center' }}>
                            ⚠️ {error}
                        </div>
                    )}
                    
                    {/* Input: Mật khẩu mới */}
                    <div className="form-group">
                        <label className="input-label">Mật khẩu mới</label>
                        <input
                            type="password"
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handleChange}
                            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                            className="input-field"
                            disabled={loading || !isTokenValid || !!message}
                            required
                        />
                    </div>

                    {/* Input: Xác nhận mật khẩu */}
                    <div className="form-group">
                        <label className="input-label">Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Nhập lại mật khẩu mới"
                            className="input-field"
                            disabled={loading || !isTokenValid || !!message}
                            required
                        />
                    </div>

                    {/* Nút Submit */}
                    <button
                        type="submit"
                        className={`login-button ${loading ? 'loading' : ''}`}
                        disabled={loading || !isTokenValid || !!message}
                        style={{ 
                            marginTop: '10px',
                            opacity: (loading || !isTokenValid || !!message) ? 0.7 : 1 
                        }}
                    >
                        {loading ? (
                            <span>⏳ Đang xử lý...</span>
                        ) : (
                            "Hoàn tất Đặt lại"
                        )}
                    </button>
                    
                    {/* Link quay lại */}
                    <div className="register-link-section" style={{ marginTop: '20px' }}>
                        <Link to="/login" className="register-link">
                            ⬅ Quay lại Đăng nhập
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}