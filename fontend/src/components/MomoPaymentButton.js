// src/components/MomoPaymentButton.js
import React, { useState } from 'react';
// ⭐️ IMPORT MỚI: Gọi API tạo link từ paymentService
import { createPaymentUrl } from '../services/paymentService'; 

/**
 * @param {string} type - 'DonHang' hoặc 'PhiPhat'
 * @param {string} id - Mã Đơn hàng hoặc Mã Trả sách
 * @param {number} amount - Số tiền
 */
const MomoPaymentButton = ({ type, id, amount }) => {
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        setLoading(true);
        try {
            // Gọi API tạo link thanh toán
            const response = await createPaymentUrl({
                loaiGiaoDich: type,
                referenceId: id,
                amount: amount
            });

            if (response.data && response.data.payUrl) {
                // Redirect sang MoMo
                window.location.href = response.data.payUrl;
            } else {
                alert("Lỗi: Server không trả về link thanh toán.");
            }
        } catch (error) {
            console.error("Lỗi thanh toán:", error);
            alert("Có lỗi kết nối đến cổng thanh toán.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button 
            onClick={handlePayment} 
            disabled={loading}
            style={{
                backgroundColor: '#a50064',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '1rem'
            }}
        >
            {loading ? 'Đang xử lý...' : 'Thanh toán MoMo'}
            <img 
                src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" 
                alt="MoMo" 
                style={{ width: '20px', height: '20px' }} 
            />
        </button>
    );
};

export default MomoPaymentButton;