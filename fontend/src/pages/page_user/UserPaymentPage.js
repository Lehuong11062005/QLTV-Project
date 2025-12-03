import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getOrders } from "../../services/orderService"; 
import MomoPaymentButton from "../../components/MomoPaymentButton"; 
import BankQrModal from "../../components/BankQrModal"; 
import "./UserPaymentPage.css";

export default function UserPaymentPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State quản lý Modal QR
    const [selectedBankOrder, setSelectedBankOrder] = useState(null); 

    useEffect(() => {
        fetchUnpaidOrders();
    }, []);

    const fetchUnpaidOrders = async () => {
        setLoading(true);
        try {
            // Chỉ cần gọi API lấy đơn hàng
            const res = await getOrders();
            const list = res.data?.data || res.data || [];

            const onlineUnpaid = list.filter(o => {
                // 1. Chuẩn hóa phương thức thanh toán
                const method = (o.phuongThucThanhToan || o.HinhThucThanhToan || '').toLowerCase();
                const isOnline = method === 'momo' || method === 'bank';
                
                // 2. Kiểm tra chưa thanh toán
                const statusPay = (o.trangThaiThanhToan || o.TrangThaiThanhToan || 'ChuaThanhToan');
                const isUnpaid = statusPay === 'ChuaThanhToan' || (!statusPay && o.trangThai !== 'HoanThanh');

                // 3. Đơn còn hiệu lực
                const isActive = o.trangThai !== 'DaHuy';

                return isOnline && isUnpaid && isActive;
            });

            setOrders(onlineUnpaid);
        } catch (error) {
            console.error("Lỗi tải đơn:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleManualPaymentSuccess = (orderId) => {
        setSelectedBankOrder(null);
        // Ẩn đơn hàng vừa trả khỏi danh sách
        setOrders(prev => prev.filter(o => (o.maDH || o.MaDH) !== orderId));
        alert("✅ Đã ghi nhận! Đơn hàng sẽ ẩn đi để chờ Admin duyệt.");
    };

    return (
        <Layout>
            <div className="payment-container">
                <h2 className="page-title">💳 Cổng Thanh Toán Online</h2>

                {loading ? <p>Đang tải...</p> : (
                    <div className="section-block">
                        <h3 className="section-title">🛒 Đơn Hàng Cần Thanh Toán ({orders.length})</h3>
                        
                        {orders.length === 0 ? (
                            <p className="empty-text">Bạn không có đơn hàng nào cần thanh toán Online.</p>
                        ) : (
                            <div className="card-grid">
                                {orders.map((order) => {
                                    // Chuẩn hóa dữ liệu hiển thị
                                    const method = (order.phuongThucThanhToan || order.HinhThucThanhToan || '').toLowerCase();
                                    const orderID = order.maDH || order.MaDH;
                                    const amount = order.tongTien || order.TongTien;

                                    return (
                                        <div key={orderID} className="pay-card">
                                            <div className="pay-card-header">
                                                <span>Đơn #{orderID}</span>
                                                <span className="status-badge pending">{order.trangThai}</span>
                                            </div>
                                            <div className="pay-card-body">
                                                <p>Ngày đặt: {order.ngayTao ? new Date(order.ngayTao).toLocaleDateString('vi-VN') : 'N/A'}</p>
                                                <p>Hình thức: <b style={{textTransform:'capitalize'}}>{method}</b></p>
                                                <p className="money-highlight">{amount?.toLocaleString()} đ</p>
                                            </div>
                                            
                                            <div className="pay-card-footer">
                                                {method === 'momo' && (
                                                    <MomoPaymentButton type="DonHang" id={orderID} amount={amount} />
                                                )}

                                                {method === 'bank' && (
                                                    <button 
                                                        className="btn-bank-pay"
                                                        style={{
                                                            background: '#2563eb', color:'white', 
                                                            border:'none', padding:'8px 15px', 
                                                            borderRadius:'4px', cursor:'pointer', width:'100%'
                                                        }}
                                                        onClick={() => setSelectedBankOrder({ maDH: orderID, tongTien: amount })}
                                                    >
                                                        🏦 Lấy mã QR Chuyển khoản
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* MODAL QR CODE */}
                {selectedBankOrder && (
                    <BankQrModal 
                        orderId={selectedBankOrder.maDH}
                        amount={selectedBankOrder.tongTien}
                        onClose={() => setSelectedBankOrder(null)}
                        onConfirm={() => handleManualPaymentSuccess(selectedBankOrder.maDH)}
                    />
                )}
            </div>
        </Layout>
    );
}