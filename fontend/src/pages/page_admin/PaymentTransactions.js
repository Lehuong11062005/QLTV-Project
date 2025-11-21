// src/pages/page_admin/PaymentTransactions.js
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getTransactionList, updateTransactionStatus } from "../../services/paymentService";
import "./PaymentTransactions.css";

export default function PaymentTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterType, setFilterType] = useState('all'); // 'all', 'DonHang', 'PhiPhat'
    const [filterDate, setFilterDate] = useState('all'); // 'all', 'today', 'week'

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const response = await getTransactionList();
            setTransactions(response.data);
        } catch (error) {
            console.error("Lỗi tải giao dịch:", error);
            // Không dùng mock data nữa
        } finally {
            setIsLoading(false);
        }
    };

    // Xử lý tính toán tổng tiền
    const calculateTotal = (type) => {
        return filteredTransactions
            .filter(t => t.TrangThai === 'HoanThanh' && (type === 'all' || t.LoaiGiaoDich === type))
            .reduce((sum, t) => sum + (t.SoTien || 0), 0);
    };

    // Xử lý lọc dữ liệu
    const filteredTransactions = transactions.filter(t => {
        if (filterType !== 'all' && t.LoaiGiaoDich !== filterType) return false;
        // Có thể thêm logic lọc ngày ở đây nếu cần
        return true;
    });

    // Hàm xử lý cập nhật trạng thái thủ công (nếu cần)
    const handleManualUpdate = async (maTT) => {
        if(window.confirm("Xác nhận cập nhật giao dịch này thành HOÀN THÀNH thủ công?")) {
            try {
                await updateTransactionStatus(maTT, 'HoanThanh');
                fetchTransactions();
            } catch(err) {
                alert("Lỗi cập nhật");
            }
        }
    }

    if (isLoading) return <Layout><h2 style={{color: '#3b82f6'}}>Đang tải lịch sử giao dịch...</h2></Layout>;

    return (
        <Layout>
            <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "10px" }}>
                💸 Quản lý Giao dịch & Thanh toán
            </h2>

            {/* Các thẻ tóm tắt doanh thu */}
            <div className="summary-cards">
                <div className="summary-card" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                    <span>Tổng Doanh Thu (Thực thu)</span>
                    <span className="sum-value">{calculateTotal('all').toLocaleString()} đ</span>
                </div>
                <div className="summary-card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    <span>Từ Bán Sách Online</span>
                    <span className="sum-value">{calculateTotal('DonHang').toLocaleString()} đ</span>
                </div>
                <div className="summary-card" style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
                    <span>Từ Phí Phạt</span>
                    <span className="sum-value">{calculateTotal('PhiPhat').toLocaleString()} đ</span>
                </div>
            </div>

            {/* Thanh lọc */}
            <div className="transaction-filter-bar">
                <label><strong>Lọc theo loại:</strong></label>
                <select 
                    className="filter-select" 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="all">Tất cả giao dịch</option>
                    <option value="DonHang">🛒 Đơn hàng Mua sách</option>
                    <option value="PhiPhat">⚖️ Nộp Phí phạt</option>
                </select>
                
                <button className="btn-primary" onClick={fetchTransactions} style={{marginLeft: 'auto'}}>
                    🔄 Làm mới
                </button>
            </div>

            {/* Bảng dữ liệu */}
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Mã GD (TT)</th>
                        <th>Người thanh toán</th>
                        <th>Loại</th>
                        <th>Tham chiếu</th>
                        <th>Số tiền</th>
                        <th>Cổng TT</th>
                        <th>Trạng thái</th>
                        <th>Thời gian</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredTransactions.length === 0 ? (
                        <tr><td colSpan="9" style={{textAlign: 'center', padding: '20px'}}>Chưa có giao dịch nào.</td></tr>
                    ) : (
                        filteredTransactions.map((t) => (
                            <tr key={t.MaTT}>
                                <td>
                                    <strong>{t.MaTT}</strong><br/>
                                    <span style={{fontSize: '0.8em', color: '#666'}}>{t.MaMoMo}</span>
                                </td>
                                <td style={{fontWeight: '500'}}>{t.NguoiThanhToan}</td>
                                <td>
                                    <span className={`badge-type ${t.LoaiGiaoDich === 'DonHang' ? 'type-order' : 'type-fine'}`}>
                                        {t.LoaiGiaoDich === 'DonHang' ? 'Mua Sách' : 'Phạt'}
                                    </span>
                                </td>
                                <td>{t.MaThamChieu}</td>
                                <td style={{fontWeight: 'bold', color: '#2563eb'}}>
                                    {t.SoTien?.toLocaleString()} đ
                                </td>
                                <td>
                                    <img 
                                        src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" 
                                        alt="MoMo" width="20" style={{verticalAlign: 'middle', marginRight: '5px'}} 
                                    />
                                    MoMo
                                </td>
                                <td>
                                    <span className={`badge-status ${
                                        t.TrangThai === 'HoanThanh' ? 'status-success' : 
                                        t.TrangThai === 'KhoiTao' ? 'status-pending' : 'status-error'
                                    }`}>
                                        {t.TrangThai}
                                    </span>
                                </td>
                                <td>{new Date(t.NgayThanhToan).toLocaleString('vi-VN')}</td>
                                <td>
                                    {t.TrangThai !== 'HoanThanh' && (
                                        <button 
                                            className="btn-check-momo"
                                            onClick={() => handleManualUpdate(t.MaTT)}
                                            title="Cập nhật thủ công nếu khách đã chuyển tiền nhưng lỗi mạng"
                                        >
                                            ✅ Duyệt
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </Layout>
    );
}