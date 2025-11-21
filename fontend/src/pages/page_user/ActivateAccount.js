// src/pages/ActivateAccount.js
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
// import axios from 'axios'; // KHÔNG CẦN NỮA
// ✅ Lấy hàm activateAccount từ authService
import { activateAccount } from "../../services/authService"; 

const ActivateAccount = () => {
    // 1. Lấy token từ URL: /activate?token=...
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [message, setMessage] = useState('Đang xác minh và kích hoạt tài khoản...');
    const [status, setStatus] = useState('loading'); // loading, success, error
    
    // Lấy token ngay khi component được render
    const token = searchParams.get('token'); 

    useEffect(() => {
        if (!token) {
            setMessage('Liên kết kích hoạt không hợp lệ.');
            setStatus('error');
            return;
        }

        const activate = async () => {
            try {
                // 2. ✅ SỬ DỤNG HÀM TỪ SERVICE: Gửi token trong đối tượng data
                const response = await activateAccount({ token }); 
                
                // Kích hoạt thành công
                // Sử dụng response.message thay vì response.data.message 
                // (Tùy thuộc vào cách authService wrap response)
                const successMessage = response.message || response.data?.message || 'Kích hoạt thành công! Đang chuyển hướng...';
                setMessage(successMessage);
                setStatus('success');
                
                // 3. Chuyển hướng về trang đăng nhập sau 3 giây
                setTimeout(() => {
                    navigate('/login');
                }, 3000);

            } catch (error) {
                // Xử lý lỗi
                // Sử dụng error.message nếu service trả về { message: "..." }
                const errorMessage = error.message || error.response?.data?.message || 'Có lỗi xảy ra trong quá trình kích hoạt.';
                setMessage(errorMessage);
                setStatus('error');
            }
        };

        activate();
    }, [token, navigate]);

    // 4. Giao diện hiển thị
    return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
            {status === 'loading' && <p>⏳ {message}</p>}
            {status === 'success' && <h2 style={{ color: 'green' }}>✅ {message}</h2>}
            {status === 'error' && <h2 style={{ color: 'red' }}>❌ {message}</h2>}
            
            {(status === 'success' || status === 'error') && (
                <button onClick={() => navigate('/login')} style={{ marginTop: '20px' }}>
                    Quay về trang Đăng nhập
                </button>
            )}
        </div>
    );
};

export default ActivateAccount;