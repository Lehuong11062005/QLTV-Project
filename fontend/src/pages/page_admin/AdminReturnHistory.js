import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import returnService from "../../services/returnService";
import "./AdminReturnHistory.css";

// Helper format tiền & ngày
const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
const formatDate = (dateString) => new Date(dateString).toLocaleString('vi-VN');

export default function AdminReturnHistory() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State cho Modal chi tiết
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [detailList, setDetailList] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // 1. Load danh sách lịch sử khi vào trang
    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await returnService.getAllReturns();
            setReturns(res.data?.data || []);
        } catch (error) {
            console.error("Lỗi tải lịch sử:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Xem chi tiết phiếu trả
    const handleViewDetail = async (record) => {
        setSelectedReturn(record);
        setShowModal(true);
        setLoadingDetail(true);
        try {
            const res = await returnService.getReturnDetail(record.MaTra);
            setDetailList(res.data?.data || []);
        } catch (error) {
            alert("Không thể tải chi tiết: " + error.message);
        } finally {
            setLoadingDetail(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedReturn(null);
        setDetailList([]);
    };

    return (
        <Layout>
            <div className="history-return-container">
                <h2 className="page-title">📜 Lịch sử Trả Sách & Phạt</h2>

                {/* BẢNG DANH SÁCH CHÍNH */}
                <div className="table-wrapper">
                    {loading ? (
                        <div className="loading-text">⏳ Đang tải dữ liệu...</div>
                    ) : returns.length === 0 ? (
                        <div className="empty-text">Chưa có dữ liệu trả sách nào.</div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Mã Trả</th>
                                    <th>Mã Mượn</th>
                                    <th>Độc Giả</th>
                                    <th>Ngày Trả</th>
                                    <th>Thủ Thư Nhận</th>
                                    <th>Tổng Phạt</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returns.map((item) => (
                                    <tr key={item.MaTra}>
                                        <td><span className="code-badge">{item.MaTra}</span></td>
                                        <td>{item.MaMuon}</td>
                                        <td style={{ fontWeight: 'bold' }}>{item.DocGia}</td>
                                        <td>{formatDate(item.NgayTra)}</td>
                                        <td>{item.ThuThuNhan}</td>
                                        <td className={item.TongTienPhat > 0 ? "text-danger" : "text-success"}>
                                            {formatCurrency(item.TongTienPhat)}
                                        </td>
                                        <td>
                                            <button 
                                                className="btn-detail-sm"
                                                onClick={() => handleViewDetail(item)}
                                            >
                                                Xem
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MODAL CHI TIẾT */}
                {showModal && selectedReturn && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Chi tiết Phiếu Trả: {selectedReturn.MaTra}</h3>
                                <button className="btn-close" onClick={closeModal}>&times;</button>
                            </div>
                            
                            <div className="modal-body">
                                <div className="modal-info-grid">
                                    <p><strong>Mã Mượn:</strong> {selectedReturn.MaMuon}</p>
                                    <p><strong>Độc Giả:</strong> {selectedReturn.DocGia}</p>
                                    <p><strong>Ngày Trả:</strong> {formatDate(selectedReturn.NgayTra)}</p>
                                </div>

                                <h4>Danh sách sách trả:</h4>
                                {loadingDetail ? (
                                    <p>Đang tải chi tiết...</p>
                                ) : (
                                    <table className="detail-table">
                                        <thead>
                                            <tr>
                                                <th>Mã Bản Sao</th>
                                                <th>Tên Sách</th>
                                                <th>Phạt Quá Hạn</th>
                                                <th>Đền Bù</th>
                                                <th>Lý Do</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailList.map((book, idx) => (
                                                <tr key={idx}>
                                                    <td>{book.MaBanSao}</td>
                                                    <td>{book.TenSach}</td>
                                                    <td>{formatCurrency(book.TienPhatQuaHan)}</td>
                                                    <td>{formatCurrency(book.TienDenBu)}</td>
                                                    <td>{book.LyDoPhat || "---"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                
                                <div className="modal-footer-info">
                                    <strong>Tổng cộng phạt: {formatCurrency(selectedReturn.TongTienPhat)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}