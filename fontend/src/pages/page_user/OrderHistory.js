import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom"; // ✅ Cần import Link để chuyển trang
import Layout from "../../components/Layout";
import { getOrders } from "../../services/orderService";

// Import CSS
import "./OrderHistory.css";

// --- HELPERS ---
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN", {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

// Helper xử lý trạng thái hiển thị & màu sắc
const getStatusInfo = (status) => {
    switch (status) {
        case "HoanThanh": 
            return { label: "Hoàn thành", class: "status-success" };
        case "DaHuy": 
            return { label: "Đã hủy", class: "status-danger" };
        case "DangGiao": 
            return { label: "Đang giao", class: "status-info" };
        case "ChoDuyet": 
            return { label: "Chờ duyệt", class: "status-warning" };
        default: 
            return { label: status, class: "status-warning" };
    }
};

// Helper hiển thị tên phương thức thanh toán thân thiện
const getPaymentLabel = (method) => {
    const map = {
        "COD": "Thanh toán khi nhận hàng",
        "Bank": "Chuyển khoản ngân hàng",
        "MoMo": "Ví MoMo"
    };
    return map[method] || method || "Chưa xác định";
};

export default function OrderHistory() {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await getOrders();
      
      // Xử lý data an toàn
      const data = response.data && Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);

      setHistoryData(data);
    } catch (error) {
      console.error("❌ Lỗi khi tải lịch sử đơn mua:", error);
      // Check lỗi 401 (Hết hạn token)
      if (error.response?.status === 401) {
         setErrorMessage("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      } else {
         setErrorMessage("Không thể tải dữ liệu đơn hàng. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <Layout>
      <div className="order-container">
        <h2 className="order-title">💰 Lịch Sử Đơn Mua</h2>

        {/* LOADING */}
        {loading && (
            <div className="alert-box alert-loading">
                ⏳ Đang tải dữ liệu đơn hàng...
            </div>
        )}

        {/* ERROR */}
        {errorMessage && (
          <div className="alert-box alert-error">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* CONTENT */}
        {!loading && !errorMessage && (
            <>
                {historyData.length === 0 ? (
                    <div className="order-empty">
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🛒</div>
                        <p>Bạn chưa mua đơn hàng nào.</p>
                        <Link to="/books" style={{ color: '#2563eb', fontWeight: 'bold', marginTop: '10px', display: 'inline-block' }}>
                            Mua sắm ngay &rarr;
                        </Link>
                    </div>
                ) : (
                    <div className="order-table-wrapper">
                        <table className="order-table">
                            <thead>
                            <tr>
                                <th>Mã Đơn Hàng</th>
                                <th>Ngày Tạo</th>
                                <th>Trạng Thái</th>
                                <th>Thanh Toán</th>
                                <th>Tổng Tiền</th>
                                <th style={{ width: '100px' }}>Chi tiết</th>
                            </tr>
                            </thead>

                            <tbody>
                            {historyData.map((item) => {
                                const statusInfo = getStatusInfo(item.trangThai);
                                return (
                                    <tr key={item.maDH}>
                                        <td>
                                            <Link to={`/order-history/${item.maDH}`} className="id-highlight">
                                                {item.maDH}
                                            </Link>
                                        </td>
                                        <td>{formatDate(item.ngayTao)}</td>
                                        
                                        <td>
                                            <span className={`status-badge ${statusInfo.class}`}>
                                                {statusInfo.label}
                                            </span>
                                        </td>

                                        <td>
                                            {getPaymentLabel(item.phuongThucThanhToan)}
                                        </td>

                                        <td>
                                            <span className="price-highlight">
                                                {formatCurrency(item.tongTien)}
                                            </span>
                                        </td>

                                        <td>
                                            <Link to={`/order-history/${item.maDH}`} className="id-highlight" style={{ fontSize: '0.9rem' }}>
                                                Xem &rarr;
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </>
        )}
      </div>
    </Layout>
  );
}