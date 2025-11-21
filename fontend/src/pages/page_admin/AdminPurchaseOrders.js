import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getAllOrdersAdmin, getOrderDetailAdmin, updateOrderStatus } from "../../services/orderService";
import "./AdminPurchaseOrders.css";

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
const formatDate = (d) => new Date(d).toLocaleString('vi-VN');

export default function AdminPurchaseOrders() {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTab, setCurrentTab] = useState("ChoDuyet"); // Tabs: ChoDuyet, DangGiao, HoanThanh, DaHuy, TatCa

    // State Modal Detail
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    
    // State cập nhật trạng thái
    const [maVanDon, setMaVanDon] = useState("");

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        if (currentTab === "TatCa") {
            setFilteredOrders(orders);
        } else {
            setFilteredOrders(orders.filter(o => o.TrangThai === currentTab));
        }
    }, [currentTab, orders]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await getAllOrdersAdmin(); // Lấy tất cả
            setOrders(res.data?.data || []);
        } catch (error) {
            console.error("Lỗi tải đơn hàng:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (orderId) => {
        try {
            const res = await getOrderDetailAdmin(orderId);
            const data = res.data?.data || [];
            if (data.length > 0) {
                // Gom nhóm thông tin
                const info = data[0];
                setSelectedOrder({
                    MaDH: info.MaDH,
                    NguoiMua: info.NguoiMua,
                    SDT: info.SDT,
                    DiaChi: info.DiaChiGiaoHang,
                    NgayTao: info.NgayTao,
                    TongTien: info.TongTien,
                    PhiVanChuyen: info.PhiVanChuyen,
                    TrangThai: info.TrangThai,
                    HinhThuc: info.HinhThucThanhToan,
                    MaVanDon: info.MaVanDon
                });
                setOrderItems(data);
                setMaVanDon(info.MaVanDon || "");
                setShowModal(true);
            }
        } catch (error) {
            alert("Lỗi tải chi tiết: " + error.message);
        }
    };

    const handleUpdateStatus = async (status) => {
        if (!window.confirm(`Xác nhận chuyển trạng thái đơn hàng sang: ${status}?`)) return;

        setProcessing(true);
        try {
            await updateOrderStatus(selectedOrder.MaDH, { 
                trangThaiMoi: status,
                maVanDon: status === 'DangGiao' ? maVanDon : undefined
            });
            alert("✅ Cập nhật thành công!");
            setShowModal(false);
            fetchOrders(); // Reload list
        } catch (error) {
            alert("❌ Lỗi: " + (error.response?.data?.message || error.message));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Layout>
            <div className="admin-orders-container">
                <h2 className="page-title">📦 Quản Lý Đơn Hàng Mua</h2>

                {/* TABS TRẠNG THÁI */}
                <div className="status-tabs">
                    {["ChoDuyet", "DangGiao", "HoanThanh", "DaHuy", "TatCa"].map(status => (
                        <button 
                            key={status}
                            className={`tab-btn ${currentTab === status ? 'active' : ''}`}
                            onClick={() => setCurrentTab(status)}
                        >
                            {status === "ChoDuyet" ? "⏳ Chờ Duyệt" : 
                             status === "DangGiao" ? "🚚 Đang Giao" :
                             status === "HoanThanh" ? "✅ Hoàn Thành" :
                             status === "DaHuy" ? "❌ Đã Hủy" : "📋 Tất Cả"}
                        </button>
                    ))}
                </div>

                {/* DANH SÁCH ĐƠN HÀNG */}
                <div className="table-wrapper">
                    {loading ? <p>Đang tải...</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Mã Đơn</th>
                                    <th>Khách Hàng</th>
                                    <th>Ngày Đặt</th>
                                    <th>Tổng Tiền</th>
                                    <th>Trạng Thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => (
                                    <tr key={order.MaDH}>
                                        <td><span className="code-badge">{order.MaDH}</span></td>
                                        <td>
                                            <div style={{fontWeight: 'bold'}}>{order.TenNguoiMua}</div>
                                            <small>{order.MaDG}</small>
                                        </td>
                                        <td>{formatDate(order.NgayTao)}</td>
                                        <td className="price-text">{formatCurrency(order.TongTien)}</td>
                                        <td>
                                            <span className={`status-badge ${order.TrangThai}`}>
                                                {order.TrangThai}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn-view" onClick={() => handleViewDetail(order.MaDH)}>
                                                Xem
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MODAL CHI TIẾT & XỬ LÝ */}
                {showModal && selectedOrder && (
                    <div className="modal-overlay">
                        <div className="modal-content large-modal">
                            <div className="modal-header">
                                <h3>Chi tiết đơn: {selectedOrder.MaDH}</h3>
                                <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
                            </div>
                            
                            <div className="modal-body">
                                <div className="info-columns">
                                    <div className="info-col">
                                        <h4>Thông tin Khách hàng</h4>
                                        <p>👤 {selectedOrder.NguoiMua}</p>
                                        <p>📞 {selectedOrder.SDT}</p>
                                        <p>📍 {selectedOrder.DiaChi}</p>
                                    </div>
                                    <div className="info-col">
                                        <h4>Thông tin Đơn hàng</h4>
                                        <p>📅 Ngày: {formatDate(selectedOrder.NgayTao)}</p>
                                        <p>💳 TT: {selectedOrder.HinhThuc}</p>
                                        <p>🚚 Ship: {formatCurrency(selectedOrder.PhiVanChuyen)}</p>
                                    </div>
                                </div>

                                <h4>Sản phẩm</h4>
                                <table className="detail-table">
                                    <thead>
                                        <tr>
                                            <th>Sách</th>
                                            <th>Giá</th>
                                            <th>SL</th>
                                            <th>Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderItems.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{item.TenSach}</td>
                                                <td>{formatCurrency(item.GiaLucDat)}</td>
                                                <td>x{item.SoLuong}</td>
                                                <td>{formatCurrency(item.GiaLucDat * item.SoLuong)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="total-row">
                                    Tổng thanh toán: <span>{formatCurrency(selectedOrder.TongTien)}</span>
                                </div>

                                {/* ACTIONS */}
                                <div className="action-area">
                                    {selectedOrder.TrangThai === "ChoDuyet" && (
                                        <>
                                            <div className="shipping-input">
                                                <label>Mã Vận Đơn (Nếu có):</label>
                                                <input 
                                                    type="text" 
                                                    value={maVanDon} 
                                                    onChange={e => setMaVanDon(e.target.value)}
                                                    placeholder="VD: GHTK123456"
                                                />
                                            </div>
                                            <div className="btn-group">
                                                <button className="btn-reject" onClick={() => handleUpdateStatus("DaHuy")}>Hủy Đơn</button>
                                                <button className="btn-approve" onClick={() => handleUpdateStatus("DangGiao")}>🚀 Xác nhận & Giao hàng</button>
                                            </div>
                                        </>
                                    )}

                                    {selectedOrder.TrangThai === "DangGiao" && (
                                        <div className="btn-group">
                                            <button className="btn-approve" onClick={() => handleUpdateStatus("HoanThanh")}>✅ Xác nhận Hoàn Thành (Đã nhận tiền)</button>
                                        </div>
                                    )}
                                    
                                    {(selectedOrder.TrangThai === "HoanThanh" || selectedOrder.TrangThai === "DaHuy") && (
                                        <p className="status-final">Đơn hàng đã kết thúc.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}