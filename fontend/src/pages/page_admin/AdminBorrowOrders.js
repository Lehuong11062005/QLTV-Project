import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { 
    getAllBorrowOrders, 
    getBorrowOrderDetails, 
    approveBorrowOrder, 
    rejectBorrowOrder 
} from "../../services/borrowService";
import "./AdminBorrowOrders.css";

// Helper format ngày
const formatDate = (dateString) => new Date(dateString).toLocaleString('vi-VN');

export default function AdminBorrowOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State cho Modal chi tiết
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Load danh sách phiếu chờ duyệt
    useEffect(() => {
        fetchPendingOrders();
    }, []);

    const fetchPendingOrders = async () => {
        setLoading(true);
        try {
            // Gọi API lấy danh sách với status = ChoDuyet
            const res = await getAllBorrowOrders({ status: 'ChoDuyet' });
            setOrders(res.data?.data || []);
        } catch (error) {
            console.error("Lỗi tải danh sách:", error);
        } finally {
            setLoading(false);
        }
    };

    // Xem chi tiết phiếu
    const handleViewDetail = async (order) => {
        setProcessing(true);
        try {
            const res = await getBorrowOrderDetails(order.MaMuon);
            setOrderItems(res.data?.data || []);
            setSelectedOrder(order);
            setShowModal(true);
        } catch (error) {
            alert("Không thể tải chi tiết phiếu mượn.");
        } finally {
            setProcessing(false);
        }
    };

    // Xử lý Duyệt
    const handleApprove = async () => {
        if (!window.confirm(`Xác nhận DUYỆT phiếu mượn ${selectedOrder.MaMuon}?`)) return;
        
        setProcessing(true);
        try {
            // Gọi API duyệt
            // Lưu ý: Backend cần lấy MaTT từ token của admin đang đăng nhập
            await approveBorrowOrder(selectedOrder.MaMuon, { 
                maTT_ChoMuon: "TT_CURRENT_USER" // Backend sẽ tự lấy từ req.user
            });
            
            alert("✅ Đã duyệt phiếu mượn thành công!");
            setShowModal(false);
            fetchPendingOrders(); // Reload danh sách
        } catch (error) {
            alert("❌ Lỗi khi duyệt: " + (error.response?.data?.message || error.message));
        } finally {
            setProcessing(false);
        }
    };

    // Xử lý Từ chối
    const handleReject = async () => {
        if (!window.confirm(`Bạn chắc chắn muốn TỪ CHỐI phiếu ${selectedOrder.MaMuon}? (Sách sẽ được hoàn kho)`)) return;

        setProcessing(true);
        try {
            await rejectBorrowOrder(selectedOrder.MaMuon);
            alert("⛔ Đã từ chối phiếu mượn.");
            setShowModal(false);
            fetchPendingOrders();
        } catch (error) {
            alert("❌ Lỗi khi từ chối: " + (error.response?.data?.message || error.message));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Layout>
            <div className="borrow-orders-container">
                <h2 className="page-title">⏳ Duyệt Yêu Cầu Mượn Sách</h2>

                {/* DANH SÁCH PHIẾU CHỜ */}
                <div className="table-wrapper">
                    {loading ? (
                        <p className="loading-text">Đang tải dữ liệu...</p>
                    ) : orders.length === 0 ? (
                        <div className="empty-state">
                            <div style={{fontSize: 40}}>✅</div>
                            <p>Không có yêu cầu nào đang chờ duyệt.</p>
                        </div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Mã Phiếu</th>
                                    <th>Độc Giả</th>
                                    <th>Ngày Yêu Cầu</th>
                                    <th>Hạn Trả Dự Kiến</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.MaMuon}>
                                        <td><span className="code-badge">{order.MaMuon}</span></td>
                                        <td style={{fontWeight: 'bold'}}>{order.HoTen}</td>
                                        <td>{formatDate(order.NgayMuon)}</td>
                                        <td>{formatDate(order.HanTra)}</td>
                                        <td>
                                            <button 
                                                className="btn-action btn-view"
                                                onClick={() => handleViewDetail(order)}
                                            >
                                                Xem & Xử lý
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MODAL XỬ LÝ */}
                {showModal && selectedOrder && (
                    <div className="modal-overlay">
                        <div className="modal-content medium-modal">
                            <div className="modal-header">
                                <h3>📝 Xử lý Phiếu: {selectedOrder.MaMuon}</h3>
                                <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
                            </div>
                            
                            <div className="modal-body">
                                <div className="info-grid">
                                    <p><strong>Người mượn:</strong> {selectedOrder.HoTen}</p>
                                    <p><strong>Ngày tạo:</strong> {formatDate(selectedOrder.NgayMuon)}</p>
                                </div>

                                <h4>Danh sách sách đăng ký:</h4>
                                <table className="detail-table">
                                    <thead>
                                        <tr>
                                            <th>Mã Sách</th>
                                            <th>Tên Sách</th>
                                            <th>Mã Bản Sao (Hệ thống chọn)</th>
                                            <th>Vị Trí</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderItems.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{item.MaSach}</td>
                                                <td>{item.TenSach}</td>
                                                <td><span className="code-tag">{item.MaBanSao}</span></td>
                                                <td>{item.ViTriKe || "Kho chính"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                <div className="modal-actions">
                                    <button 
                                        className="btn-reject" 
                                        onClick={handleReject}
                                        disabled={processing}
                                    >
                                        ⛔ Từ chối (Hủy)
                                    </button>
                                    <button 
                                        className="btn-approve" 
                                        onClick={handleApprove}
                                        disabled={processing}
                                    >
                                        ✅ Duyệt & Giao Sách
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}