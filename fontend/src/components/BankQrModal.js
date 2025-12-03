import React from 'react';
import './BankQrModal.css'; // Đừng quên tạo file CSS bên dưới

export default function BankQrModal({ orderId, amount, onClose, onConfirm }) {
    
    // 1. Cấu hình tài khoản nhận tiền (Thay bằng STK thật của bạn)
    const BANK_INFO = {
        ID: "MB",           // Mã ngân hàng (MB, VCB, ACB...)
        ACC: "0123456789",  // Số tài khoản
        TEMPLATE: "compact2" // Giao diện QR
    };

    // 2. Tạo link QR tự động
    const qrUrl = `https://img.vietqr.io/image/${BANK_INFO.ID}-${BANK_INFO.ACC}-${BANK_INFO.TEMPLATE}.png?amount=${amount}&addInfo=THANHTOAN ${orderId}`;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>💳 Quét mã thanh toán</h3>
                    <button className="btn-close-icon" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <p>Thanh toán đơn hàng: <b>#{orderId}</b></p>
                    
                    <div className="qr-container">
                        <img src={qrUrl} alt="Mã QR VietQR" />
                    </div>

                    <div className="bank-info">
                        <p>Ngân hàng: <b>{BANK_INFO.ID}</b></p>
                        <p>Số tiền: <b className="text-red">{amount?.toLocaleString('vi-VN')} đ</b></p>
                        <p>Nội dung: <b>THANHTOAN {orderId}</b></p>
                    </div>

                    <div className="instruction">
                        <small>⚠️ Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động xử lý.</small>
                    </div>
                </div>

                <div className="modal-footer">
                    {/* Nút này gọi hàm onConfirm để báo cho trang cha biết là đã trả */}
                    <button className="btn-confirm" onClick={onConfirm}>
                        ✅ Tôi đã chuyển khoản xong
                    </button>
                    
                    <button className="btn-cancel" onClick={onClose}>
                        Đóng (Trả sau)
                    </button>
                </div>
            </div>
        </div>
    );
}