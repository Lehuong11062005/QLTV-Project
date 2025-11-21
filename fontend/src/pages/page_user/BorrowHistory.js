import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getBorrowHistory } from '../../services/borrowService';

import './BorrowHistory.css';

// ---------------------------
// 📚 HÀM HỖ TRỢ (HELPERS)
// ---------------------------
const formatDate = (dateString) => {
    if (!dateString) return '---';
    try {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch (e) {
        return 'Ngày lỗi';
    }
};

const getStatusClass = (status) => {
    switch (status) {
        case 'DaTraHet': return 'status-success'; // Xanh lá
        case 'DaDuyet': return 'status-primary';  // Xanh dương
        case 'QuaHan': return 'status-danger';    // Đỏ
        case 'DaHuy': return 'status-danger';     // Đỏ
        default: return 'status-warning';         // Vàng (ChoDuyet)
    }
};

const getStatusLabel = (status) => {
    const map = {
        'DaTraHet': 'Đã trả hết',
        'QuaHan': 'Quá hạn',
        'DaDuyet': 'Đang mượn',
        'ChoDuyet': 'Chờ duyệt',
        'DangMuon': 'Đang mượn',
        'DaHuy': 'Đã hủy',
    };
    return map[status] || status;
};

// ---------------------------
// 📜 COMPONENT CHÍNH
// ---------------------------
export default function BorrowHistory() {
    const navigate = useNavigate();
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await getBorrowHistory();

            // ✅ LOGIC HỨNG DỮ LIỆU CHUẨN (Dựa trên log bạn vừa gửi)
            if (response.data && response.data.data) {
                setHistoryData(response.data.data);
            } else {
                // Fallback phòng hờ
                setHistoryData(response.data || []);
            }
        } catch (err) {
            console.error("Lỗi tải lịch sử:", err);
            // Check lỗi 401 để logout nếu cần
            if (err.response && err.response.status === 401) {
                setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            } else {
                setError('Không thể tải dữ liệu lịch sử.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleDetailClick = (maMuon) => {
        // Điều hướng sang trang chi tiết (bạn sẽ làm trang này sau)
        navigate(`/user/borrow-detail/${maMuon}`);
    };

    return (
        <Layout>
            <div className="history-container">
                <h2 className="history-title">📜 Lịch Sử Mượn Sách</h2>
                <p className="history-subtitle">
                    Danh sách các phiếu mượn sách và trạng thái của bạn.
                </p>
                
                {/* HIỂN THỊ TRẠNG THÁI */}
                {loading && (<div className="alert-box alert-loading">⏳ Đang tải dữ liệu...</div>)}
                {error && (<div className="alert-box alert-error">❌ {error}</div>)}
                
                {/* BẢNG DỮ LIỆU */}
                {!loading && !error && (
                    <>
                        {historyData.length === 0 ? (
                            <div className="history-empty">
                                📭 Bạn chưa có phiếu mượn sách nào.
                                <p>Xem <Link to="/books">Danh mục sách</Link> để bắt đầu mượn.</p>
                            </div>
                        ) : (
                            <div className="history-table-wrapper">
                                <table className="history-table">
                                    <thead>
                                        <tr>
                                            <th>Mã Phiếu</th>
                                            <th>Ngày Mượn</th>
                                            <th>Hạn Trả</th>
                                            <th>Trạng Thái</th>
                                            <th className="text-center">Số Lượng</th>
                                            <th style={{ width: '100px' }}>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyData.map((item) => (
                                            <tr key={item.maMuon}>
                                                <td>
                                                    <span className="id-highlight">{item.maMuon}</span>
                                                </td>
                                                <td>{formatDate(item.ngayMuon)}</td>
                                                <td>{formatDate(item.hanTra)}</td>
                                                <td>
                                                    <span className={`status-badge ${getStatusClass(item.trangThai)}`}>
                                                        {getStatusLabel(item.trangThai)}
                                                    </span>
                                                </td>
                                                <td className="text-center font-bold">
                                                    {item.tongSoSach || 0} cuốn
                                                </td>
                                                <td>
                                                    <button 
                                                        className="btn-detail"
                                                        onClick={() => handleDetailClick(item.maMuon)}
                                                    >
                                                        Chi tiết
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}