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
            setTransactions(response.data || []);
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
            viaBank: completed.filter(t => t.PhuongThuc === 'NganHang').reduce((sum, t) => sum + (t.SoTien || 0), 0),
            viaCash: completed.filter(t => t.PhuongThuc === 'TienMat').reduce((sum, t) => sum + (t.SoTien || 0), 0),
            viaMoMo: completed.filter(t => t.PhuongThuc === 'MoMo').reduce((sum, t) => sum + (t.SoTien || 0), 0),
        };
    }, [transactions]);

    // --- LOGIC LỌC HIỂN THỊ ---
    const filteredTransactions = transactions.filter(t => {
        if (filterType !== 'all' && t.LoaiGiaoDich !== filterType) return false;
        if (filterMethod !== 'all' && t.PhuongThuc !== filterMethod) return false;
        if (filterStatus !== 'all' && t.TrangThai !== filterStatus) return false;
        return true;
    });

    // Hàm xử lý Duyệt tay (Cho Ngân hàng)
    const handleApproveBankTransfer = async (maTT, amount) => {
        const confirmMsg = `💰 XÁC NHẬN ĐÃ NHẬN TIỀN?\n\nBạn đã kiểm tra App Ngân hàng và thấy giao dịch ${amount.toLocaleString()}đ chưa?`;
        if(window.confirm(confirmMsg)) {
            try {
                await updateTransactionStatus(maTT, 'HoanThanh');
                alert("✅ Đã cập nhật trạng thái thành công!");
                fetchTransactions(); // Load lại data
            } catch(err) {
                alert("❌ Lỗi: " + (err.response?.data?.message || err.message));
            }
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '---';

    // Helper: Style cho Phương thức
    const getMethodBadge = (method) => {
        switch(method) {
            case 'MoMo': return <span className="badge-method momo">🟣 MoMo</span>;
            case 'NganHang': return <span className="badge-method bank">🏦 Chuyển khoản</span>;
            case 'TienMat': return <span className="badge-method cash">💵 Tiền mặt</span>;
            default: return <span className="badge-method default">{method}</span>;
        }
    };

    if (isLoading) return <Layout><div className="loading-state">⏳ Đang tải dữ liệu...</div></Layout>;

    return (
        <Layout>
            <div className="transaction-page">
                <h2 className="page-title">💸 Quản lý Dòng tiền (Cashflow)</h2>

                {/* --- CARD THỐNG KÊ --- */}
                <div className="summary-cards">
                    <div className="summary-card total-revenue">
                        <div className="card-label">TỔNG THỰC THU</div>
                        <div className="card-value">{formatCurrency(stats.totalReal)}</div>
                        <div className="card-sub">Tiền đã về túi</div>
                    </div>
                    <div className="summary-card">
                        <div className="card-label">🏦 Ngân hàng</div>
                        <div className="card-value sm">{formatCurrency(stats.viaBank)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="card-label">💵 Tiền mặt (Phạt)</div>
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
                            <option value="NganHang">🏦 Chuyển khoản (Cần duyệt)</option>
                            <option value="TienMat">💵 Tiền mặt</option>
                            <option value="MoMo">🟣 MoMo (Tự động)</option>
                        </select>

                        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="all">-- Tất cả trạng thái --</option>
                            <option value="ChoThanhToan">⏳ Chờ thanh toán (Pending)</option>
                            <option value="HoanThanh">✅ Đã hoàn thành</option>
                        </select>
                    </div>
                    <button className="btn-refresh" onClick={fetchTransactions}>🔄 Làm mới</button>
                </div>

                {/* --- BẢNG --- */}
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Mã GD</th>
                                <th>Khách hàng</th>
                                <th>Nội dung / Loại</th>
                                <th>Số tiền</th>
                                <th>Nguồn tiền</th>
                                <th>Trạng thái</th>
                                <th>Thời gian</th>
                                <th style={{textAlign: 'center'}}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr><td colSpan="8" className="text-center">Không có giao dịch nào phù hợp.</td></tr>
                            ) : filteredTransactions.map((t) => (
                                <tr key={t.MaTT} className={t.TrangThai === 'ChoThanhToan' ? 'row-pending' : ''}>
                                    <td>
                                        <div className="trans-id">{t.MaTT}</div>
                                        <div className="ref-id">{t.MaThamChieu || t.MaDH}</div>
                                    </td>
                                    <td>
                                        <div style={{fontWeight: '600'}}>{t.NguoiThanhToan}</div>
                                    </td>
                                    <td>
                                        <div>{t.LoaiGiaoDich === 'PhiPhat' ? '⚖️ Nộp phạt' : '🛒 Mua sách'}</div>
                                        <small style={{color: '#666'}}>{t.NoiDung || 'Không có ghi chú'}</small>
                                    </td>
                                    <td className="money-cell">{formatCurrency(t.SoTien)}</td>
                                    <td>{getMethodBadge(t.PhuongThuc)}</td>
                                    <td>
                                        <span className={`badge-status ${t.TrangThai}`}>
                                            {t.TrangThai === 'HoanThanh' ? 'Đã thu tiền' : 'Chưa thanh toán'}
                                        </span>
                                    </td>
                                    <td style={{fontSize:'0.85rem'}}>{formatDate(t.NgayThanhToan)}</td>
                                    
                                    <td style={{textAlign: 'center'}}>
                                        {/* Nút DUYỆT chỉ hiện khi: Chờ thanh toán VÀ là Chuyển khoản */}
                                        {t.TrangThai === 'ChoThanhToan' && t.PhuongThuc === 'NganHang' && (
                                            <button 
                                                className="btn-approve" 
                                                onClick={() => handleApproveBankTransfer(t.MaTT, t.SoTien)}
                                                title="Bấm vào đây sau khi đã nhận được tiền trong tài khoản"
                                            >
                                                ✅ Xác nhận
                                            </button>
                                        )}

                                        {/* Tiền mặt/MoMo thì thường tự động xong rồi, chỉ hiện dấu tick */}
                                        {t.TrangThai === 'HoanThanh' && <span style={{color:'#16a34a'}}>✔</span>}
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