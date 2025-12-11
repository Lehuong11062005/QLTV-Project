// src/pages/page_user/UserPaymentPage.js

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
            const res = await getOrders();
            // Lấy đúng mảng data từ JSON bạn gửi
            const list = res.data?.data || res.data || [];

            console.log("Tổng số đơn hàng tải về:", list.length);

            const onlineUnpaid = list.filter(o => {
                // --- BƯỚC 1: CHUẨN HÓA DỮ LIỆU (Về chữ hoa để so sánh) ---
                const method = (o.phuongThucThanhToan || o.HinhThucThanhToan || '').toUpperCase();
                const paymentStatus = (o.trangThaiThanhToan || o.TrangThaiThanhToan || '').toUpperCase();
                const orderStatus = (o.trangThai || o.TrangThai || '').toUpperCase();

                // --- BƯỚC 2: CÁC ĐIỀU KIỆN ĐỂ ẨN ĐƠN HÀNG ---
                
                // 1. Nếu không phải MoMo hoặc Bank -> ẨN (Ví dụ: COD, Tiền mặt)
                const isOnline = method.includes('MOMO') || method.includes('BANK');
                if (!isOnline) return false;

                // 2. Nếu đã trả tiền (DATHANHTOAN) -> ẨN NGAY
                if (paymentStatus === 'DATHANHTOAN') return false;

                // 3. Nếu đơn hàng đã xong hoặc hủy -> ẨN LUÔN
                // (Dù tiền là "ChuaThanhToan" nhưng đơn đã HoanThanh thì không đòi nữa)
                const finishedStatuses = ['HOANTHANH', 'DANGGIAO', 'DADUYET', 'DAHUY'];
                if (finishedStatuses.includes(orderStatus)) return false;

                // 👉 Chỉ hiện khi: Là Online + Chưa trả tiền + Đơn chưa xong
                return true;
            });

            console.log("Số đơn cần thanh toán sau khi lọc:", onlineUnpaid.length);
            setOrders(onlineUnpaid);
            
        } catch (error) {
            console.error("Lỗi tải đơn:", error);
        } finally {
            setLoading(false);
        }
    };
    const handleManualPaymentSuccess = (orderId) => {
        setSelectedBankOrder(null);
        // Ẩn ngay đơn hàng vừa trả khỏi giao diện
        setOrders(prev => prev.filter(o => (o.maDH || o.MaDH) !== orderId));
        alert("✅ Đã ghi nhận! Hệ thống sẽ kiểm tra và duyệt đơn trong giây lát.");
    };

    return (
        <Layout>
            <div className="payment-container">
                {/* Tiêu đề trang nằm trên cùng */}
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
                                                <span className="status-badge pending">
                                                    {order.trangThai || 'Chờ thanh toán'}
                                                </span>
                                            </div>
                                            
                                            <div className="pay-card-body">
                                                <p>
                                                    <span>Ngày đặt:</span> 
                                                    <b>{order.ngayTao ? new Date(order.ngayTao).toLocaleDateString('vi-VN') : 'N/A'}</b>
                                                </p>
                                                <p>
                                                    <span>Hình thức:</span> 
                                                    <b style={{textTransform:'capitalize'}}>{method === 'momo' ? 'Ví MoMo' : 'Ngân Hàng'}</b>
                                                </p>
                                                <span className="money-highlight">
                                                    {amount?.toLocaleString()} đ
                                                </span>
                                            </div>
                                            
                                            <div className="pay-card-footer">
                                                {method === 'momo' && (
                                                    <MomoPaymentButton type="DonHang" id={orderID} amount={amount} />
                                                )}

                                                {method === 'bank' && (
                                                    <button 
                                                        className="btn-bank-pay"
                                                        onClick={() => setSelectedBankOrder({ maDH: orderID, tongTien: amount })}
                                                    >
                                                        🏦 Lấy mã QR Bank
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