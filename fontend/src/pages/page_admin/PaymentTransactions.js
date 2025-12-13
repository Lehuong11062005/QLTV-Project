// src/pages/page_admin/PaymentTransactions.js
import React, { useState, useEffect, useMemo } from "react";
import Layout from "../../components/Layout";
import { getTransactionList, updateTransactionStatus } from "../../services/paymentService";
import "./PaymentTransactions.css";

export default function PaymentTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Bộ lọc
    const [filterMethod, setFilterMethod] = useState('all'); 
    const [filterStatus, setFilterStatus] = useState('all'); 

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const response = await getTransactionList();
            const list = response.data || [];
            // Sắp xếp: Mới nhất lên đầu
            setTransactions(list.sort((a, b) => new Date(b.NgayThanhToan || b.NgayTao) - new Date(a.NgayThanhToan || a.NgayTao)));
        } catch (error) {
            console.error("Lỗi tải giao dịch:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = useMemo(() => {
        const completed = transactions.filter(t => t.TrangThai === 'HoanThanh');
        const calcSum = (arr) => arr.reduce((sum, t) => sum + (Number(t.SoTien) || 0), 0);

        return {
            totalReal: calcSum(completed),
            viaBank: calcSum(completed.filter(t => {
                const m = (t.PhuongThuc || '').toLowerCase();
                return m.includes('bank') || m.includes('ngan') || m.includes('chuyen');
            })),
            viaCash: calcSum(completed.filter(t => {
                const m = (t.PhuongThuc || '').toLowerCase();
                return m.includes('tien') || m.includes('mat') || m.includes('cod');
            })),
            viaMoMo: calcSum(completed.filter(t => (t.PhuongThuc || '').toLowerCase().includes('momo'))),
        };
    }, [transactions]);

    const filteredTransactions = transactions.filter(t => {
        if (filterMethod !== 'all') {
            const m = (t.PhuongThuc || '').toLowerCase();
            const f = filterMethod.toLowerCase();
            if (f === 'nganhang' && !m.includes('bank') && !m.includes('ngan') && !m.includes('chuyen')) return false;
            if (f === 'momo' && !m.includes('momo')) return false;
            if (f === 'tienmat' && !m.includes('tien') && !m.includes('cod')) return false;
        }

        if (filterStatus !== 'all') {
            if (filterStatus === 'pending') {
                if (t.TrangThai === 'HoanThanh' || t.TrangThai === 'Loi') return false;
            } else if (filterStatus === 'completed') {
                if (t.TrangThai !== 'HoanThanh') return false;
            }
        }
        return true;
    });

    const handleApprovePayment = async (maTT, amount, method) => {
        const confirmMsg = `💰 XÁC NHẬN DUYỆT GIAO DỊCH?\n\n` + 
                           `Mã: ${maTT} (${method})\n` +
                           `Số tiền: ${parseInt(amount).toLocaleString()} đ\n\n` + 
                           `Bạn chắc chắn tiền đã về tài khoản chưa?`;
        
        if(window.confirm(confirmMsg)) {
            try {
                await updateTransactionStatus(maTT, 'HoanThanh');
                alert("✅ Đã duyệt thành công!");
                fetchTransactions(); 
            } catch(err) {
                alert("❌ Lỗi: " + (err.response?.data?.message || err.message));
            }
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '---';

    const renderMethodBadge = (method) => {
        const m = (method || '').toLowerCase();
        if (m.includes('momo')) return <span className="badge-method momo"><img src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" width="16" alt=""/> MoMo</span>;
        if (m.includes('bank') || m.includes('ngan') || m.includes('chuyen')) return <span className="badge-method bank">🏦 Chuyển khoản</span>;
        return <span className="badge-method cash">💵 Tiền mặt/COD</span>;
    };

    const renderStatusBadge = (status) => {
        if (status === 'HoanThanh') return <span className="badge-status HoanThanh">Thành công</span>;
        if (status === 'Loi') return <span className="badge-status Loi">Thất bại</span>;
        return <span className="badge-status ChoThanhToan">⏳ Chờ duyệt</span>;
    };

    // --- 🔥 LOGIC QUAN TRỌNG NHẤT: ĐIỀU KIỆN HIỆN NÚT ---
    const renderActionColumn = (t) => {
        // 1. Đã Hoàn Thành -> Hiện dấu tích xanh (Không hiện nút nữa)
        if (t.TrangThai === 'HoanThanh') {
            return <div className="check-icon" title="Đã hoàn thành">✔</div>;
        }

        // 2. Chưa Hoàn Thành -> Kiểm tra phương thức
        const m = (t.PhuongThuc || '').toLowerCase();
        
        // Nếu là COD hoặc Tiền mặt -> KHÔNG HIỆN NÚT (Vì thu sau khi giao)
        if (m.includes('cod') || m.includes('tien') || m.includes('mat')) {
            return <span style={{fontSize:'0.85rem', color:'#94a3b8', fontStyle:'italic'}}>Thu khi giao</span>;
        }

        // Nếu là Online (MoMo / Bank / ChuyenKhoan) -> HIỆN NÚT DUYỆT
        // (Áp dụng cho cả 'KhoiTao' và 'ChoThanhToan' trong JSON bạn gửi)
        const isOnline = m.includes('momo') || m.includes('bank') || m.includes('ngan') || m.includes('chuyen');
        
        if (isOnline) {
            return (
                <button 
                    className="btn-approve"
                    onClick={() => handleApprovePayment(t.MaTT, t.SoTien, t.PhuongThuc)}
                    title="Xác nhận tiền đã về"
                >
                    ✅ Duyệt
                </button>
            );
        }

        // Trường hợp khác -> Hiện dấu gạch
        return <span>-</span>;
    };

    if (isLoading) return <Layout><div className="loading-state">⏳ Đang tải dữ liệu...</div></Layout>;

    return (
        <Layout>
            <div className="transaction-page">
                <div className="page-header-flex">
                    <h2 className="page-title">💸 Quản lý Giao dịch & Dòng tiền</h2>
                    <button className="btn-refresh" onClick={fetchTransactions}>🔄 Làm mới</button>
                </div>

                {/* THỐNG KÊ */}
                <div className="summary-cards">
                    <div className="summary-card total-revenue">
                        <div className="card-label">TỔNG THỰC THU</div>
                        <div className="card-value">{formatCurrency(stats.totalReal)}</div>
                    </div>
                    <div className="summary-card" style={{background: 'linear-gradient(135deg, #b2ffd5ff, #37f599ff)'}}>
                        <div className="card-label">Qua Ngân hàng</div>
                        <div className="card-value sm" style={{color:'#1e40af'}}>{formatCurrency(stats.viaBank)}</div>
                    </div>
                    <div className="summary-card" style={{background: 'linear-gradient(135deg, #f398c7ff, #f74da5ff)'}}>
                        <div className="card-label">Qua MoMo</div>
                        <div className="card-value sm" style={{color:'#be185d'}}>{formatCurrency(stats.viaMoMo)}</div>
                    </div>
                    <div className="summary-card" style={{background: 'linear-gradient(135deg, #FCA5A5, #f65f5fff)'}}>
                        <div className="card-label">Tiền mặt / COD</div>
                        <div className="card-value sm" style={{color:'#334155'}}>{formatCurrency(stats.viaCash)}</div>
                    </div>
                </div>

                {/* BỘ LỌC */}
                <div className="filter-bar">
                    <select className="filter-select" value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                        <option value="all">-- Tất cả nguồn tiền --</option>
                        <option value="MoMo">🟣 MoMo</option>
                        <option value="NganHang">🏦 Chuyển khoản</option>
                        <option value="TienMat">💵 Tiền mặt / COD</option>
                    </select>

                    <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">-- Tất cả trạng thái --</option>
                        <option value="pending">⏳ Đang chờ duyệt</option>
                        <option value="completed">✅ Đã hoàn thành</option>
                    </select>
                </div>

                {/* BẢNG DỮ LIỆU */}
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Mã GD</th>
                                <th>Nội dung / Tham chiếu</th>
                                <th>Số tiền</th>
                                <th>Phương thức</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo / TT</th>
                                <th style={{textAlign:'center', minWidth:'130px'}}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="7" style={{textAlign:'center', padding:'30px'}}>Đang tải dữ liệu...</td></tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr><td colSpan="7" style={{textAlign:'center', padding:'30px', fontStyle:'italic'}}>Không tìm thấy giao dịch nào.</td></tr>
                            ) : (
                                filteredTransactions.map((t) => (
                                    <tr key={t.MaTT} className={t.TrangThai !== 'HoanThanh' && t.TrangThai !== 'Loi' ? 'row-pending' : ''}>
                                        <td>
                                            <div className="trans-id">{t.MaTT}</div>
                                            {t.MaMoMo && <div style={{fontSize:'0.75rem', color:'#94a3b8'}}>{t.MaMoMo}</div>}
                                        </td>
                                        <td>
                                            <div className="ref-content">
                                                <span>{t.LoaiGiaoDich === 'PhiPhat' ? '⚖️ Nộp phạt' : '🛒 Đơn hàng'}</span>
                                                <span className="ref-code">Ref: {t.MaThamChieu || t.MaDH || t.MaPhat}</span>
                                            </div>
                                            <div className="user-note">{t.NoiDung}</div>
                                        </td>
                                        <td className="money-cell">{formatCurrency(t.SoTien)}</td>
                                        <td>{renderMethodBadge(t.PhuongThuc)}</td>
                                        <td>{renderStatusBadge(t.TrangThai)}</td>
                                        <td style={{fontSize:'0.9rem', color:'#475569'}}>
                                            {formatDate(t.NgayThanhToan || t.NgayTao)}
                                        </td>
                                        <td style={{textAlign:'center'}}>
                                            {renderActionColumn(t)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}