// src/pages/page_admin/AdminPurchaseOrders.js
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
    const [currentTab, setCurrentTab] = useState("ChoDuyet");

    // Modal
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [showModal, setShowModal] = useState(false);
    
    // Input cập nhật
    const [maVanDon, setMaVanDon] = useState("");

    useEffect(() => { fetchOrders(); }, []);

    useEffect(() => {
        if (currentTab === "TatCa") setFilteredOrders(orders);
        else setFilteredOrders(orders.filter(o => o.TrangThai === currentTab));
    }, [currentTab, orders]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await getAllOrdersAdmin();
            setOrders(res.data?.data || []);
        } catch (error) { console.error("Lỗi tải đơn:", error); } 
        finally { setLoading(false); }
    };

    // 🔥 Helper hiển thị trạng thái thanh toán
    const getPaymentBadge = (status) => {
        if (status === 'DaThanhToan') return <span className="badge-paid">✅ Đã TT</span>;
        return <span className="badge-unpaid">⚠️ Chưa TT</span>;
    };

    const handleViewDetail = async (orderId) => {
        try {
            const res = await getOrderDetailAdmin(orderId);
            const data = res.data?.data || [];
            if (data.length > 0) {
                const info = data[0];
                setSelectedOrder({ ...info }); // Spread toàn bộ thông tin (bao gồm TrangThaiThanhToan)
                setOrderItems(data);
                setMaVanDon(info.MaVanDon || "");
                setShowModal(true);
            }
        } catch (e) { alert("Lỗi tải chi tiết"); }
    };

    const handleUpdateStatus = async (status) => {
        // 🔥 LOGIC AN TOÀN: Cảnh báo nếu giao hàng cho đơn chưa trả tiền
        if (status === 'DangGiao') {
            const isOnline = selectedOrder.HinhThucThanhToan === 'MoMo' || selectedOrder.HinhThucThanhToan === 'Bank';
            const isUnpaid = selectedOrder.TrangThaiThanhToan === 'ChuaThanhToan';
            
            if (isOnline && isUnpaid) {
                // Nếu chưa trả tiền -> Hiện cảnh báo xác nhận
                const confirmShip = window.confirm(
                    "⚠️ CẢNH BÁO NGUY HIỂM!\n\n" +
                    "Đơn hàng này thanh toán Online nhưng trạng thái là CHƯA THANH TOÁN.\n" +
                    "Bạn có chắc chắn muốn giao hàng không?"
                );
                if (!confirmShip) return; // Dừng lại nếu Admin bấm Cancel
            }
        }

        if (!window.confirm(`Xác nhận chuyển trạng thái sang: ${status}?`)) return;

        try {
            await updateOrderStatus(selectedOrder.MaDH, { 
                trangThaiMoi: status,
                maVanDon: status === 'DangGiao' ? maVanDon : undefined
            });
            alert("✅ Cập nhật thành công!");
            setShowModal(false);
            fetchOrders();
        } catch (error) {
            alert("❌ Lỗi: " + error.message);
        }
    };

    return (
        <Layout>
            <div className="admin-orders-container">
                <h2 className="page-title">📦 Quản Lý Đơn Hàng</h2>

                <div className="status-tabs">
                    {["ChoDuyet", "DangGiao", "HoanThanh", "DaHuy", "TatCa"].map(st => (
                        <button key={st} className={`tab-btn ${currentTab === st ? 'active' : ''}`} onClick={() => setCurrentTab(st)}>
                            {st === "TatCa" ? "Tất Cả" : st}
                        </button>
                    ))}
                </div>

                <div className="table-wrapper">
                    {loading ? <p>Đang tải...</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Mã Đơn</th>
                                    <th>Khách Hàng</th>
                                    <th>Ngày Đặt</th>
                                    <th>Tổng Tiền</th>
                                    <th>Thanh Toán</th> {/* Cột mới */}
                                    <th>Trạng Thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => (
                                    <tr key={order.MaDH}>
                                        <td><b>{order.MaDH}</b></td>
                                        <td>{order.TenNguoiMua}<br/><small>{order.MaDG}</small></td>
                                        <td>{formatDate(order.NgayTao)}</td>
                                        <td className="price-text">{formatCurrency(order.TongTien)}</td>
                                        
                                        {/* 🔥 Cột hiển thị trạng thái thanh toán */}
                                        <td>
                                            <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                                                <small>{order.HinhThucThanhToan}</small>
                                                {getPaymentBadge(order.TrangThaiThanhToan)}
                                            </div>
                                        </td>

                                        <td><span className={`status-badge ${order.TrangThai}`}>{order.TrangThai}</span></td>
                                        <td>
                                            <button className="btn-view" onClick={() => handleViewDetail(order.MaDH)}>Xem</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MODAL CHI TIẾT */}
                {showModal && selectedOrder && (
                    <div className="modal-overlay">
                        <div className="modal-content large-modal">
                            <div className="modal-header">
                                <h3>Đơn hàng #{selectedOrder.MaDH}</h3>
                                <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
                            </div>
                            
                            <div className="modal-body">
                                <div className="info-row">
                                    <p><b>Khách hàng:</b> {selectedOrder.NguoiMua} - {selectedOrder.SDT}</p>
                                    <p><b>Địa chỉ:</b> {selectedOrder.DiaChiGiaoHang}</p>
                                    <p>
                                        <b>Thanh toán:</b> {selectedOrder.HinhThucThanhToan} 
                                        <span style={{marginLeft:'10px'}}>{getPaymentBadge(selectedOrder.TrangThaiThanhToan)}</span>
                                    </p>
                                </div>

                                <table className="detail-table">
                                    <thead><tr><th>Sách</th><th>Giá</th><th>SL</th><th>Thành tiền</th></tr></thead>
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
                                
                                <div className="total-row">Tổng cộng: {formatCurrency(selectedOrder.TongTien)}</div>

                                <div className="action-area">
                                    {selectedOrder.TrangThai === "ChoDuyet" && (
                                        <>
                                            <input 
                                                type="text" placeholder="Nhập Mã Vận Đơn (nếu có)" 
                                                value={maVanDon} onChange={e => setMaVanDon(e.target.value)} 
                                                className="input-shipping"
                                            />
                                            <button className="btn-reject" onClick={() => handleUpdateStatus("DaHuy")}>Hủy Đơn</button>
                                            <button className="btn-approve" onClick={() => handleUpdateStatus("DangGiao")}>🚀 Xác nhận & Giao hàng</button>
                                        </>
                                    )}
                                    {selectedOrder.TrangThai === "DangGiao" && (
                                        <button className="btn-complete" onClick={() => handleUpdateStatus("HoanThanh")}>
                                            ✅ Hoàn thành (Đã giao & Nhận tiền)
                                        </button>
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