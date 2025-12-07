// src/pages/page_admin/PaymentTransactions.js
import React, { useState, useEffect, useMemo } from "react";
import Layout from "../../components/Layout";
import { getTransactionList, updateTransactionStatus } from "../../services/paymentService";
import "./PaymentTransactions.css";

export default function PaymentTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Bộ lọc
    const [filterType, setFilterType] = useState('all');   // Loại: Mua/Phạt
    const [filterMethod, setFilterMethod] = useState('all'); // Phương thức: MoMo/Bank/Cash
    const [filterStatus, setFilterStatus] = useState('all'); // Trạng thái: Chờ/Xong

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const response = await getTransactionList();
            // Đảm bảo data là mảng, sắp xếp mới nhất lên đầu
            const list = response.data || [];
            setTransactions(list.sort((a, b) => new Date(b.NgayThanhToan || b.NgayTao) - new Date(a.NgayThanhToan || a.NgayTao)));
        } catch (error) {
            console.error("Lỗi tải giao dịch:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- LOGIC THỐNG KÊ (Chỉ tính tiền ĐÃ THU ĐƯỢC - Hoàn Thành) ---
    const stats = useMemo(() => {
        const completed = transactions.filter(t => t.TrangThai === 'HoanThanh');
        return {
            totalReal: completed.reduce((sum, t) => sum + (t.SoTien || 0), 0),
            viaBank: completed.filter(t => t.PhuongThuc === 'NganHang' || t.PhuongThuc === 'Bank').reduce((sum, t) => sum + (t.SoTien || 0), 0),
            viaCash: completed.filter(t => t.PhuongThuc === 'TienMat' || t.PhuongThuc === 'COD').reduce((sum, t) => sum + (t.SoTien || 0), 0),
            viaMoMo: completed.filter(t => t.PhuongThuc === 'MoMo').reduce((sum, t) => sum + (t.SoTien || 0), 0),
        };
    }, [transactions]);

    // --- LOGIC LỌC HIỂN THỊ ---
    const filteredTransactions = transactions.filter(t => {
        if (filterType !== 'all' && t.LoaiGiaoDich !== filterType) return false;
        
        if (filterMethod !== 'all') {
            // Chuẩn hóa so sánh chuỗi (vì DB có thể lưu Bank, NganHang, momo, MoMo...)
            const method = (t.PhuongThuc || '').toLowerCase();
            const filter = filterMethod.toLowerCase();
            
            if (filter === 'nganhang' && !method.includes('bank') && !method.includes('ngan')) return false;
            if (filter === 'momo' && !method.includes('momo')) return false;
            if (filter === 'tienmat' && !method.includes('tien') && !method.includes('cod')) return false;
        }

        if (filterStatus !== 'all' && t.TrangThai !== filterStatus) return false;
        return true;
    });

    // 🔥 HÀM DUYỆT THANH TOÁN THỦ CÔNG (QUAN TRỌNG)
    const handleApprovePayment = async (maTT, amount, method) => {
        const confirmMsg = `💰 XÁC NHẬN ĐÃ NHẬN TIỀN (${method})?\n\n` + 
                           `Số tiền: ${amount.toLocaleString()} đ\n` +
                           `Bạn xác nhận tiền đã về tài khoản chưa?`;
        
        if(window.confirm(confirmMsg)) {
            try {
                // Gọi API cập nhật trạng thái -> HoanThanh
                // Backend sẽ tự động cập nhật DonHang -> DaThanhToan
                await updateTransactionStatus(maTT, 'HoanThanh');
                
                alert("✅ Đã cập nhật thành công! Đơn hàng liên quan đã được đánh dấu 'Đã thanh toán'.");
                fetchTransactions(); // Load lại data
            } catch(err) {
                alert("❌ Lỗi: " + (err.response?.data?.message || err.message));
            }
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '---';

    const getMethodBadge = (method) => {
        const m = (method || '').toLowerCase();
        if (m.includes('momo')) return <span className="badge-method momo">🟣 MoMo</span>;
        if (m.includes('bank') || m.includes('ngan')) return <span className="badge-method bank">🏦 Chuyển khoản</span>;
        if (m.includes('tien') || m.includes('cod')) return <span className="badge-method cash">💵 Tiền mặt</span>;
        return <span className="badge-method default">{method}</span>;
    };

    if (isLoading) return <Layout><div className="loading-state">⏳ Đang tải dữ liệu dòng tiền...</div></Layout>;

    return (
        <Layout>
            <div className="transaction-page">
                <div className="page-header-flex">
                    <h2 className="page-title">💸 Quản lý Dòng tiền (Cashflow)</h2>
                    <div className="last-updated">Cập nhật lúc: {new Date().toLocaleTimeString()}</div>
                </div>

                {/* --- CARD THỐNG KÊ --- */}
                <div className="summary-cards">
                    <div className="summary-card total-revenue">
                        <div className="card-label">TỔNG THỰC THU</div>
                        <div className="card-value">{formatCurrency(stats.totalReal)}</div>
                        <div className="card-sub">Tiền đã về túi (Hoàn thành)</div>
                    </div>
                    <div className="summary-card">
                        <div className="card-label">🏦 Ngân hàng</div>
                        <div className="card-value sm">{formatCurrency(stats.viaBank)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="card-label">💵 Tiền mặt / COD</div>
                        <div className="card-value sm">{formatCurrency(stats.viaCash)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="card-label">🟣 MoMo</div>
                        <div className="card-value sm">{formatCurrency(stats.viaMoMo)}</div>
                    </div>
                </div>

                {/* --- BỘ LỌC --- */}
                <div className="filter-bar">
                    <div className="filter-group">
                        <select className="filter-select" value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                            <option value="all">-- Tất cả nguồn tiền --</option>
                            <option value="NganHang">🏦 Chuyển khoản</option>
                            <option value="TienMat">💵 Tiền mặt / COD</option>
                            <option value="MoMo">🟣 MoMo</option>
                        </select>

                        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="all">-- Tất cả trạng thái --</option>
                            <option value="ChoThanhToan">⏳ Chờ duyệt (Cần xử lý)</option>
                            <option value="HoanThanh">✅ Đã hoàn thành</option>
                        </select>
                    </div>
                    <button className="btn-refresh" onClick={fetchTransactions}>🔄 Làm mới bảng</button>
                </div>

                {/* --- BẢNG --- */}
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Mã GD</th>
                                <th>Nội dung / Tham chiếu</th>
                                <th>Số tiền</th>
                                <th>Nguồn tiền</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo / TT</th>
                                <th style={{textAlign: 'center', width: '150px'}}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr><td colSpan="7" className="text-center empty-row">Không có giao dịch nào phù hợp.</td></tr>
                            ) : filteredTransactions.map((t) => (
                                <tr key={t.MaTT} className={t.TrangThai === 'ChoThanhToan' ? 'row-pending' : ''}>
                                    <td>
                                        <div className="trans-id" title={t.MaTT}>{t.MaTT}</div>
                                    </td>
                                    <td>
                                        <div className="ref-content">
                                            {t.LoaiGiaoDich === 'PhiPhat' ? '⚖️ Nộp phạt' : '🛒 Mua sách'} 
                                            <span className="ref-code">Ref: {t.MaThamChieu || t.MaDH}</span>
                                        </div>
                                        <div className="user-note">{t.NoiDung}</div>
                                    </td>
                                    <td className="money-cell">{formatCurrency(t.SoTien)}</td>
                                    <td>{getMethodBadge(t.PhuongThuc)}</td>
                                    <td>
                                        <span className={`badge-status ${t.TrangThai}`}>
                                            {t.TrangThai === 'HoanThanh' ? 'Đã thu tiền' : 'Chờ duyệt'}
                                        </span>
                                    </td>
                                    <td style={{fontSize:'0.85rem'}}>
                                        <div>{formatDate(t.NgayThanhToan || t.NgayTao)}</div>
                                    </td>
                                    
                                    <td style={{textAlign: 'center'}}>
                                        {/* 🔥 LOGIC NÚT DUYỆT: Hiện cho cả Bank và MoMo nếu đang chờ */}
                                        {t.TrangThai === 'ChoThanhToan' ? (
                                            <button 
                                                className="btn-approve" 
                                                onClick={() => handleApprovePayment(t.MaTT, t.SoTien, t.PhuongThuc)}
                                                title="Xác nhận đã nhận được tiền"
                                            >
                                                ✅ Duyệt
                                            </button>
                                        ) : (
                                            <span className="check-icon">✔</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}