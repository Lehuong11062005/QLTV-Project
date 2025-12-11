import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./PaymentResult.css"; // Nhớ import CSS

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const navigate = useNavigate();

  return (
    <div className="payment-container">
      <div className="payment-card">
        <div className="status-icon success-icon">
          <i className="fa-solid fa-circle-check"></i> {/* Nếu dùng FontAwesome */}
          {/* Hoặc dùng emoji nếu lười: */} ✅
        </div>
        
        <h1 className="payment-title">Thanh toán thành công!</h1>
        
        <div className="payment-info">
          <p>Cảm ơn bạn đã thanh toán.</p>
          <p>Mã giao dịch:</p>
          <strong>{orderId || "MOMO123456"}</strong>
        </div>

        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => navigate("/")}>
            Về trang chủ
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/user/history")}>
            Xem lịch sử
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;