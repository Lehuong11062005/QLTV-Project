// src/pages/page_admin/PaymentTransactions.js
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getTransactionList, updateTransactionStatus } from "../../services/paymentService";
import "./PaymentTransactions.css";

export default function PaymentTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterType, setFilterType] = useState('all'); // 'all', 'DonHang', 'PhiPhat'

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
        } finally {
            setIsLoading(false);
        }
    };

    // 🔥 FIX: Tính tổng dựa trên 'transactions' (data gốc) để số liệu luôn đúng
    const calculateTotal = (type) => {
        return transactions
            .filter(t => t.TrangThai === 'HoanThanh' && (type === 'all' || t.LoaiGiaoDich === type))
            .reduce((sum, t) => sum + (t.SoTien || 0), 0);
    };

    // Xử lý lọc danh sách hiển thị
    const filteredTransactions = transactions.filter(t => {
        if (filterType !== 'all' && t.LoaiGiaoDich !== filterType) return false;
        return true;
    });

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

    if (isLoading) return <Layout><div style={{padding:'20px'}}>Đang tải dữ liệu...</div></Layout>;

    return (
        <Layout>
            <div className="transaction-page">
                <h2 className="page-title">💸 Quản lý Giao dịch & Dòng tiền</h2>

                {/* --- KHỐI THỐNG KÊ (Dữ liệu luôn đúng nhờ hàm fix ở trên) --- */}
                <div className="summary-cards">
                    <div className="summary-card total">
                        <span>Tổng Thực Thu</span>
                        <span className="sum-value">{calculateTotal('all').toLocaleString()} đ</span>
                    </div>
                    <div className="summary-card order">
                        <span>Từ Bán Sách</span>
                        <span className="sum-value">{calculateTotal('DonHang').toLocaleString()} đ</span>
                    </div>
                    <div className="summary-card fine">
                        <span>Từ Phí Phạt</span>
                        <span className="sum-value">{calculateTotal('PhiPhat').toLocaleString()} đ</span>
                    </div>
                </div>

                {/* --- THANH CÔNG CỤ --- */}
                <div className="filter-bar">
                    <select 
                        className="filter-select" 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">Tất cả giao dịch</option>
                        <option value="DonHang">🛒 Đơn hàng Mua sách</option>
                        <option value="PhiPhat">⚖️ Nộp Phí phạt</option>
                    </select>
                    
                    <button className="btn-refresh" onClick={fetchTransactions}>🔄 Làm mới</button>
                </div>

                {/* --- BẢNG DỮ LIỆU --- */}
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Mã GD</th>
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
                        {filteredTransactions.map((t) => (
                            <tr key={t.MaTT}>
                                <td>
                                    <strong>{t.MaTT}</strong><br/>
                                    <small style={{color:'#666'}}>{t.MaMoMo || t.MaGiaoDich}</small>
                                </td>
                                <td>{t.NguoiThanhToan}</td>
                                <td>
                                    <span className={`badge-type ${t.LoaiGiaoDich}`}>
                                        {t.LoaiGiaoDich === 'DonHang' ? 'Mua Sách' : 'Phạt'}
                                    </span>
                                </td>
                                <td>{t.MaThamChieu}</td>
                                <td style={{fontWeight:'bold', color:'#2563eb'}}>
                                    {t.SoTien?.toLocaleString()} đ
                                </td>
                                <td>{t.PhuongThuc}</td>
                                <td>
                                    <span className={`badge-status ${t.TrangThai}`}>
                                        {t.TrangThai}
                                    </span>
                                </td>
                                <td>{new Date(t.NgayThanhToan).toLocaleString('vi-VN')}</td>
                                <td>
                                    {t.TrangThai !== 'HoanThanh' && (
                                        <button className="btn-check" onClick={() => handleManualUpdate(t.MaTT)}>
                                            ✅ Duyệt
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Layout>
    );
}