import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getBorrowDetail } from '../../services/borrowService'; 

// Cần tạo file BorrowDetail.css
import './BorrowDetail.css'; 

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
        return 'Ngày không hợp lệ';
    }
};

const getStatusClass = (status) => {
    switch (status) {
        case 'DaTraHet': return 'badge-success';
        case 'QuaHan': return 'badge-danger';
        case 'DaDuyet': return 'badge-primary';
        case 'ChoDuyet': return 'badge-warning';
        default: return 'badge-secondary';
    }
};

const getStatusLabel = (status) => {
    const map = {
        'DaTraHet': 'Đã trả hết',
        'QuaHan': 'Quá hạn',
        'DaDuyet': 'Đã duyệt',
        'ChoDuyet': 'Chờ duyệt',
        'DangMuon': 'Đang mượn',
    };
    return map[status] || status;
};

// ---------------------------
// 🧩 TÁI CẤU TRÚC DỮ LIỆU TỪ API
// ---------------------------

const restructureBorrowDetail = (records) => {
    if (!records || records.length === 0) return null;
    
    const firstRecord = records[0];
    
    // Ánh xạ PascalCase từ API sang camelCase cho thông tin phiếu
    const borrowInfo = {
        maMuon: firstRecord.MaMuon,
        ngayMuon: firstRecord.NgayMuon,
        hanTra: firstRecord.HanTra,
        trangThai: firstRecord.TrangThai, 
        maDG: firstRecord.MaDG,
        maTTChoMuon: firstRecord.MaTT_ChoMuon,
    };

    // Tạo mảng chi tiết sách mượn
    const bookDetails = records.map(r => ({
        maSach: r.MaSach,
        tenSach: r.TenSach,
        maBanSao: r.MaBanSao, // Mã bản sao (Dùng làm key)
        anhMinhHoa: r.AnhMinhHoa,
    }));

    return {
        ...borrowInfo,
        sachMuon: bookDetails,
    };
};


// ---------------------------
// 📜 COMPONENT CHÍNH
// ---------------------------

export default function BorrowDetail() {
    const { maMuon } = useParams();
    const navigate = useNavigate();
    
    const [detailData, setDetailData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDetail = useCallback(async () => {
        if (!maMuon) {
            setError('Thiếu Mã phiếu mượn.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            
            const response = await getBorrowDetail(maMuon);
            const records = response.data?.data || response.data || [];
            
            if (records.length === 0 || !records[0].MaMuon) { 
                 setError(`Không tìm thấy chi tiết phiếu mượn ${maMuon} hoặc bạn không có quyền truy cập.`);
                 setDetailData(null);
            } else {
                const structuredData = restructureBorrowDetail(records);
                setDetailData(structuredData);
            }
        } catch (err) {
            console.error('❌ Lỗi tải chi tiết mượn:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Lỗi kết nối server.';
            setError(`Lỗi: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, [maMuon]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);
    
    // --- XỬ LÝ RENDER TRẠNG THÁI ---
    
    if (loading) {
        return <Layout><div className="loading-message">⏳ Đang tải chi tiết phiếu mượn...</div></Layout>;
    }

    if (error) {
        return (
            <Layout>
                <div className="alert-box alert-error error-message-container">
                    ❌ {error}
                    {/* ✅ Sửa navigate về route đã được khai báo: /borrow-history */}
                    <button onClick={() => navigate('/borrow-history')} className="btn-back"> 
                        ← Quay lại Lịch sử Mượn
                    </button>
                </div>
            </Layout>
        );
    }

    if (!detailData) {
        return <Layout><div className="not-found">Không tìm thấy chi tiết phiếu mượn.</div></Layout>;
    }

    // ---------------------------
    // RENDER GIAO DIỆN CHI TIẾT
    // ---------------------------

    return (
        <Layout>
            <div className="borrow-detail-container">
                <h2 className="detail-title">📖 Chi tiết Phiếu Mượn: <span className="id-highlight">{detailData.maMuon}</span></h2>
                
                <div className="detail-header">
                    <div className="status-info">
                        Trạng thái: 
                        <span className={`status-badge ${getStatusClass(detailData.trangThai)}`}>
                            {getStatusLabel(detailData.trangThai)}
                        </span>
                    </div>
                    <div className="date-info">
                        Ngày mượn: <strong>{formatDate(detailData.ngayMuon)}</strong>
                    </div>
                    <div className="date-info">
                        Hạn trả: <strong>{formatDate(detailData.hanTra)}</strong>
                    </div>
                </div>
                
                <h3 className="section-title">Danh sách Sách đã Mượn ({detailData.sachMuon.length})</h3>
                
                <div className="book-list">
                    {detailData.sachMuon.map((book) => (
                        <div key={book.maBanSao} className="book-item"> {/* ✅ SỬ DỤNG maBanSao LÀM KEY */}
                            {book.anhMinhHoa && (
                                <img src={book.anhMinhHoa} alt={book.tenSach} className="book-image" />
                            )}
                            <div className="book-info">
                                <p className="book-name">
                                    {book.tenSach}
                                </p>
                                <p className="book-copy">
                                    Mã bản sao: <strong>{book.maBanSao}</strong>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="detail-actions">
                    <button onClick={() => navigate('/borrow-history')} className="btn-back"> {/* ✅ Sửa navigate */}
                        ← Quay lại Lịch sử Mượn
                    </button>
                </div>
            </div>
        </Layout>
    );
}