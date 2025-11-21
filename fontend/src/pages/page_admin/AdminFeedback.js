import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
// ✅ SỬA: Import từ feedbackService thay vì adminService
import { getAllFeedbacks, updateFeedbackStatus } from "../../services/feedbackService"; 
import "./AdminFeedback.css"; 

export default function AdminFeedback() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [filterStatus, setFilterStatus] = useState("Tất cả");

    // --- 1. Lấy danh sách phản hồi ---
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            setError(null);
            try {
                // ✅ SỬA: Gọi hàm getAllFeedbacks
                const response = await getAllFeedbacks({
                    status: filterStatus !== "Tất cả" ? filterStatus : undefined,
                });
                
                // Xử lý dữ liệu an toàn (backend trả về { code: 200, data: [...] })
                const data = response.data && response.data.data 
                    ? response.data.data 
                    : (Array.isArray(response.data) ? response.data : []);

                const dataWithState = data.map(f => ({ ...f, isSubmitting: false }));
                setFeedbacks(dataWithState); 

            } catch (err) {
                console.error("❌ Lỗi tải phản hồi:", err);
                setError("Không thể tải dữ liệu. Vui lòng kiểm tra kết nối.");
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [filterStatus]);

    // --- 2. Cập nhật trạng thái ---
    const handleUpdateStatus = async (MaPH, newStatus) => {
        if (!window.confirm(`Xác nhận chuyển trạng thái sang "${newStatus}"?`)) return;

        // Set loading cục bộ
        setFeedbacks(prev => prev.map(f => f.MaPH === MaPH ? { ...f, isSubmitting: true } : f));
        if (selectedFeedback?.MaPH === MaPH) setSelectedFeedback(prev => ({ ...prev, isSubmitting: true }));

        try {
            // ✅ SỬA: Gọi hàm updateFeedbackStatus
            await updateFeedbackStatus(MaPH, newStatus);

            // Cập nhật UI
            const updateUI = (item) => item.MaPH === MaPH 
                ? { ...item, TrangThai: newStatus, isSubmitting: false } 
                : item;

            setFeedbacks(prev => prev.map(updateUI));
            if (selectedFeedback?.MaPH === MaPH) setSelectedFeedback(prev => updateUI(prev));

            alert(`✅ Cập nhật thành công!`);
        } catch (err) {
            alert(`Lỗi: ${err.response?.data?.message || "Thất bại."}`);
            // Reset loading
            const resetUI = (item) => item.MaPH === MaPH ? { ...item, isSubmitting: false } : item;
            setFeedbacks(prev => prev.map(resetUI));
            if (selectedFeedback?.MaPH === MaPH) setSelectedFeedback(prev => resetUI(prev));
        }
    };

    const StatusOptions = ["Tất cả", "Chưa xử lý", "Đang xử lý", "Đã xử lý"];

    // --- 3. Render (Giữ nguyên cấu trúc JSX và ClassName như cũ để khớp CSS) ---
    return (
        <Layout>
            <div className="feedback-container">
                <h2 className="page-title">💬 Quản lý Phản hồi Độc giả</h2>

                {/* Filter Bar */}
                <div className="filter-bar">
                    <div className="filter-group">
                        <label>Lọc trạng thái:</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="filter-select"
                        >
                            {StatusOptions.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-summary">
                        Hiển thị: <b>{feedbacks.length}</b> phản hồi
                    </div>
                </div>

                {/* Loading/Error */}
                {isLoading && <div className="loading">⏳ Đang tải dữ liệu...</div>}
                {error && <div className="error">⚠️ {error}</div>}

                {/* Table */}
                {!isLoading && !error && (
                    <div className="table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th width="80">Mã PH</th>
                                    <th>Nội dung</th>
                                    <th>Người gửi</th>
                                    <th width="120">Ngày gửi</th>
                                    <th width="120">Trạng thái</th>
                                    <th width="100" className="text-center">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody>
                                {feedbacks.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="empty-text">Không có dữ liệu.</td>
                                    </tr>
                                ) : (
                                    feedbacks.map(f => (
                                        <tr key={f.MaPH} className={f.TrangThai === "Chưa xử lý" ? "row-highlight" : ""}>
                                            <td><span className="code-badge">{f.MaPH}</span></td>
                                            <td>
                                                <div className="content-preview">
                                                    {f.NoiDung ? (f.NoiDung.length > 50 ? `${f.NoiDung.substring(0, 50)}...` : f.NoiDung) : "---"}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="user-name">{f.TenDocGia}</div>
                                                <div className="user-email">{f.Email}</div>
                                            </td>
                                            <td>{new Date(f.NgayGui).toLocaleDateString('vi-VN')}</td>
                                            <td>
                                                <span className={`status-badge ${getStatusClass(f.TrangThai)}`}>
                                                    {f.TrangThai}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <button 
                                                    className="btn-view"
                                                    onClick={() => setSelectedFeedback(f)}
                                                >
                                                    Xem
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modal */}
                {selectedFeedback && (
                    <FeedbackDetailModal
                        feedback={selectedFeedback}
                        onClose={() => setSelectedFeedback(null)}
                        onUpdateStatus={handleUpdateStatus}
                    />
                )}
            </div>
        </Layout>
    );
}

// Component Modal (Giữ nguyên logic hiển thị)
const FeedbackDetailModal = ({ feedback, onClose, onUpdateStatus }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chi tiết: {feedback.MaPH}</h3>
                    <button className="btn-close-modal" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Người gửi:</label>
                            <div>{feedback.TenDocGia}<br/><small>{feedback.Email}</small></div>
                        </div>
                        <div className="info-item">
                            <label>Thời gian:</label>
                            <div>{new Date(feedback.NgayGui).toLocaleString('vi-VN')}</div>
                        </div>
                        <div className="info-item">
                            <label>Trạng thái:</label>
                            <div><span className={`status-badge ${getStatusClass(feedback.TrangThai)}`}>{feedback.TrangThai}</span></div>
                        </div>
                        {feedback.TenNguoiXuLy && (
                             <div className="info-item">
                                <label>Xử lý bởi:</label>
                                <div className="admin-name">{feedback.TenNguoiXuLy}</div>
                            </div>
                        )}
                    </div>
                    <div className="content-box">
                        <label>Nội dung:</label>
                        <p>{feedback.NoiDung}</p>
                    </div>
                    <div className="modal-footer">
                        {feedback.TrangThai === "Chưa xử lý" && (
                            <button className="btn-process" onClick={() => onUpdateStatus(feedback.MaPH, "Đang xử lý")} disabled={feedback.isSubmitting}>
                                {feedback.isSubmitting ? "..." : "▶️ Tiếp nhận xử lý"}
                            </button>
                        )}
                        {feedback.TrangThai !== "Đã xử lý" && (
                            <button className="btn-complete" onClick={() => onUpdateStatus(feedback.MaPH, "Đã xử lý")} disabled={feedback.isSubmitting}>
                                {feedback.isSubmitting ? "..." : "✅ Hoàn tất"}
                            </button>
                        )}
                        <button className="btn-close-modal" onClick={onClose}>Đóng</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const getStatusClass = (status) => {
    switch (status) {
        case "Chưa xử lý": return "pending";
        case "Đang xử lý": return "processing";
        case "Đã xử lý": return "completed";
        default: return "";
    }
};