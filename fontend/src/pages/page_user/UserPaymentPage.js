// src/pages/page_user/UserPaymentPage.js
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getOrders } from "../../services/orderService"; 
import { getBorrowHistory } from "../../services/borrowService"; 
import MomoPaymentButton from "../../components/MomoPaymentButton"; 
import "./UserPaymentPage.css";

export default function UserPaymentPage() {
    const [unpaidOrders, setUnpaidOrders] = useState([]);
    const [unpaidFines, setUnpaidFines] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUnpaidItems();
    }, []);

    const fetchUnpaidItems = async () => {
        setLoading(true);
        try {
            // 1. Lấy Đơn hàng
            const ordersRes = await getOrders();
            
            // FIX 1: Truy cập sâu vào .data.data để lấy mảng
            // Cấu trúc từ axios là: ordersRes.data (body) -> .data (mảng của bạn)
            const orderList = ordersRes.data?.data || []; 

            // FIX 2: Lọc dữ liệu
            // Lưu ý: JSON bạn gửi không có trường 'TrangThaiThanhToan', 
            // nên mình tạm lọc theo 'trangThai' có trong JSON là 'ChoDuyet' hoặc 'DangGiao'.
            // Bạn hãy đổi lại logic if cần thiết.
            const filteredOrders = orderList.filter(o => 
                o.trangThai === 'ChoDuyet' || o.trangThai === 'DangGiao'
            );
            
            setUnpaidOrders(filteredOrders);

            // 2. Lấy Khoản phạt
            const borrowRes = await getBorrowHistory();
            // Tương tự, kiểm tra kỹ cấu trúc API borrowRes
            const borrowList = borrowRes.data?.data || borrowRes.data || []; 
            setUnpaidFines(Array.isArray(borrowList) ? borrowList.filter(r => r.TongTienPhat > 0) : []);

        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Layout><div style={{textAlign:'center', padding:'40px'}}>Đang tải các khoản nợ...</div></Layout>;

    return (
        <Layout>
            <div className="payment-container">
                <h2 className="page-title">💳 Cổng Thanh Toán Cá Nhân</h2>

                {/* Khu vực 1: Đơn Hàng */}
                <div className="section-block">
                    <h3 className="section-title">🛒 Đơn Mua Sách Chờ Thanh Toán ({unpaidOrders.length})</h3>
                    {unpaidOrders.length === 0 ? (
                        <p className="empty-text">Tuyệt vời! Bạn đã thanh toán hết các đơn hàng.</p>
                    ) : (
                        <div className="card-grid">
                            {unpaidOrders.map((order, index) => (
                                /* FIX 3: Sửa key và tên biến khớp với JSON (maDH, ngayTao, tongTien) */
                                <div key={order.maDH || index} className="pay-card">
                                    <div className="pay-card-header">
                                        <span>Đơn hàng #{order.maDH}</span>
                                        <span className="status-badge pending">
                                            {order.trangThai}
                                        </span>
                                    </div>
                                    <div className="pay-card-body">
                                        <p>Ngày đặt: {order.ngayTao ? new Date(order.ngayTao).toLocaleDateString('vi-VN') : 'N/A'}</p>
                                        <p>HTTT: <strong>{order.phuongThucThanhToan}</strong></p>
                                        <p className="money-highlight">{order.tongTien?.toLocaleString()} đ</p>
                                    </div>
                                    <div className="pay-card-footer">
                                        {/* Chỉ hiện nút thanh toán nếu là MoMo hoặc logic của bạn cho phép */}
                                        <MomoPaymentButton type="DonHang" id={order.maDH} amount={order.tongTien} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Khu vực 2: Phí Phạt */}
                <div className="section-block">
                    <h3 className="section-title text-red">⚖️ Phí Phạt Cần Nộp ({unpaidFines.length})</h3>
                    {unpaidFines.length === 0 ? (
                        <p className="empty-text">Bạn là một độc giả uy tín! Không có khoản phạt nào.</p>
                    ) : (
                        <div className="card-grid">
                            {unpaidFines.map((fine, index) => (
                                <div key={fine.MaTra || index} className="pay-card fine-card">
                                    <div className="pay-card-header">
                                        <span>Phiếu trả #{fine.MaTra}</span>
                                        <span className="status-badge error">Phạt vi phạm</span>
                                    </div>
                                    <div className="pay-card-body">
                                        <p>Lý do: {fine.LyDoPhat || 'Quá hạn/Hư hỏng'}</p>
                                        <p className="money-highlight text-red">{fine.TongTienPhat?.toLocaleString()} đ</p>
                                    </div>
                                    <div className="pay-card-footer">
                                        <MomoPaymentButton type="PhiPhat" id={fine.MaTra} amount={fine.TongTienPhat} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}