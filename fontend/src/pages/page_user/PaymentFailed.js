import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./PaymentResult.css"; // Dùng chung CSS với file trên

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason");
  const navigate = useNavigate();

  return (
    <div className="payment-container">
      <div className="payment-card">
        <div className="status-icon failed-icon">
           {/* Dùng emoji hoặc icon FontAwesome */}
           ❌
        </div>
        
        <h1 className="payment-title" style={{ color: "#dc3545" }}>
          Thanh toán thất bại
        </h1>
        
        <div className="payment-info">
          <p>Giao dịch không thể thực hiện.</p>
          <p>Lý do:</p>
          <strong style={{ color: "#dc3545" }}>
            {reason || "Lỗi không xác định hoặc đã hủy"}
          </strong>
        </div>

        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => navigate("/")}>
            Về trang chủ
          </button>
          <button 
            className="btn btn-primary" 
            style={{ backgroundColor: "#dc3545" }} // Nút đỏ cho hợp ngữ cảnh lỗi
            onClick={() => navigate("/checkout")}
          >
            Thử lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;