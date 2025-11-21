// src/pages/page_user/OrderDetail.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { getOrderDetail } from "../../services/orderService";
import "./OrderDetail.css";

// --- HELPERS ---
const formatCurrency = (amount) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const formatDate = (dateString) => {
    if (!dateString) return "---";
    try {
        return new Date(dateString).toLocaleString("vi-VN", { 
            hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit', year: 'numeric' 
        });
    } catch {
        return dateString;
    }
};

const getStatusLabel = (status) => {
    const map = {
        "HoanThanh": { text: "Hoàn thành", color: "#10b981" },
        "DaHuy": { text: "Đã hủy", color: "#ef4444" },
        "DangGiao": { text: "Đang giao", color: "#3b82f6" },
        "ChoDuyet": { text: "Chờ duyệt", color: "#f59e0b" },
    };
    const s = map[status] || { text: status, color: "#6b7280" };
    return <span style={{ color: s.color, fontWeight: 'bold' }}>{s.text}</span>;
};

export default function OrderDetail() {
    const { maDH } = useParams();
    const navigate = useNavigate();
    
    const [orderInfo, setOrderInfo] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const response = await getOrderDetail(maDH);
                
                // Xử lý dữ liệu linh hoạt (cho cả dạng {data: [...]} và dạng mảng trực tiếp)
                const rawData = response.data && response.data.data ? response.data.data : (response.data || []);

                if (rawData.length > 0) {
                    const firstRow = rawData[0];

                    // 1. Tách thông tin chung của đơn hàng
                    // Lưu ý: Dùng đúng tên trường như trong JSON bạn gửi (PascalCase)
                    setOrderInfo({
                        MaDH: firstRow.MaDH,
                        NgayTao: firstRow.NgayTao,
                        TrangThai: firstRow.TrangThai,
                        DiaChiGiaoHang: firstRow.DiaChiGiaoHang,
                        HinhThucThanhToan: firstRow.HinhThucThanhToan,
                        PhiVanChuyen: Number(firstRow.PhiVanChuyen) || 0,
                        TongTien: Number(firstRow.TongTien) || 0
                    });

                    // 2. Tách danh sách sản phẩm
                    // Map lại để đảm bảo tên trường chuẩn cho vòng lặp render
                    const items = rawData.map(item => ({
                        MaSach: item.MaSach,
                        TenSach: item.TenSach,
                        AnhMinhHoa: item.AnhMinhHoa,
                        SoLuong: Number(item.SoLuong),
                        GiaLucDat: Number(item.GiaLucDat || item.DonGia || 0) // Fallback nếu tên trường thay đổi
                    }));
                    setOrderItems(items);

                } else {
                    setError("Không tìm thấy thông tin đơn hàng.");
                }
            } catch (err) {
                console.error("Lỗi tải chi tiết đơn:", err);
                // Check lỗi 404 hoặc 500
                if (err.response && err.response.status === 404) {
                     setError("Đơn hàng không tồn tại hoặc đã bị xóa.");
                } else {
                     setError("Lỗi kết nối server. Vui lòng thử lại sau.");
                }
            } finally {
                setLoading(false);
            }
        };

        if (maDH) fetchDetail();
    }, [maDH]);

    if (loading) return <Layout><div className="p-5 text-center">⏳ Đang tải chi tiết...</div></Layout>;
    if (error) return <Layout><div className="p-5 text-center text-red-500">❌ {error}</div></Layout>;
    if (!orderInfo) return null;

    // Tính tạm tính = Tổng tiền sách (chưa gồm ship)
    const subTotal = orderItems.reduce((sum, item) => sum + (item.GiaLucDat * item.SoLuong), 0);

    return (
        <Layout>
            <div className="order-detail-container">
                {/* HEADER & BACK BUTTON */}
                <div style={{ marginBottom: '20px' }}>
                    <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
                        &larr; Quay lại lịch sử
                    </button>
                    <h2 className="text-2xl font-bold mt-2">Chi tiết đơn hàng #{orderInfo.MaDH}</h2>
                </div>

                {/* THÔNG TIN CHUNG */}
                <div className="order-header-card">
                    <div className="order-meta-grid">
                        <div className="meta-item">
                            <label>Ngày đặt hàng</label>
                            <span>{formatDate(orderInfo.NgayTao)}</span>
                        </div>
                        <div className="meta-item">
                            <label>Trạng thái</label>
                            {getStatusLabel(orderInfo.TrangThai)}
                        </div>
                        <div className="meta-item">
                            <label>Thanh toán</label>
                            <span>{orderInfo.HinhThucThanhToan}</span>
                        </div>
                        <div className="meta-item">
                            <label>Địa chỉ giao hàng</label>
                            <span>{orderInfo.DiaChiGiaoHang}</span>
                        </div>
                    </div>
                </div>

                {/* DANH SÁCH SẢN PHẨM */}
                <div className="order-items-card">
                    <h3 className="font-bold text-lg mb-4 border-b pb-2">Danh sách sản phẩm</h3>
                    
                    {orderItems.map((item, index) => (
                        <div key={index} className="item-row">
                            <img 
                                src={item.AnhMinhHoa} 
                                alt={item.TenSach} 
                                className="item-image"
                                onError={(e) => e.target.src = 'https://via.placeholder.com/70x90?text=Book'}
                            />
                            <div className="item-info">
                                <Link to={`/books/${item.MaSach}`} className="item-name hover:text-blue-600">
                                    {item.TenSach}
                                </Link>
                                <div className="item-meta">
                                    {formatCurrency(item.GiaLucDat)} x {item.SoLuong}
                                </div>
                            </div>
                            <div className="item-total">
                                {formatCurrency(item.GiaLucDat * item.SoLuong)}
                            </div>
                        </div>
                    ))}

                    {/* TỔNG KẾT TIỀN */}
                    <div className="order-summary">
                        <div className="summary-box">
                            <div className="summary-row">
                                <span>Tạm tính:</span>
                                <span>{formatCurrency(subTotal)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Phí vận chuyển:</span>
                                <span>{formatCurrency(orderInfo.PhiVanChuyen)}</span>
                            </div>
                            <div className="summary-row total">
                                <span>Tổng cộng:</span>
                                <span>{formatCurrency(orderInfo.TongTien)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}