import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import feedbackService from "../../services/feedbackService";
import "./Feedback.css";

// Helper format ngày tháng
const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Helper class trạng thái
const getStatusClass = (status) => {
  switch (status) {
    case "Đã xử lý": return "status-completed";
    case "Đang xử lý": return "status-processing";
    default: return "status-pending";
  }
};

export default function Feedback() {
  const [message, setMessage] = useState("");
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Lấy danh sách phản hồi
  const fetchFeedbacks = async () => {
    setFetching(true);
    try {
      const res = await feedbackService.getMyFeedbacks();
      // Backend trả về { code: 200, data: [...] } hoặc mảng trực tiếp tùy cấu hình
      const data = res.data && res.data.data ? res.data.data : (res.data || []);
      setFeedbackHistory(data);
    } catch (err) {
      console.error("❌ Lỗi lấy lịch sử:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // Gửi phản hồi
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      alert("⚠️ Vui lòng nhập nội dung phản hồi!");
      return;
    }

    setLoading(true);
    try {
      // API endpoint mong đợi: { noiDung: "..." }
      await feedbackService.sendFeedback({ noiDung: message });
      
      alert("✅ Gửi phản hồi thành công!");
      setMessage("");
      fetchFeedbacks(); // Load lại danh sách
    } catch (err) {
      console.error("❌ Lỗi gửi phản hồi:", err);
      const errMsg = err.response?.data?.message || "Vui lòng kiểm tra lại kết nối.";
      alert(`❌ Không thể gửi phản hồi: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="feedback-container">
        <h2 className="feedback-heading">🗣️ Gửi Phản Hồi & Góp Ý</h2>

        {/* FORM GỬI */}
        <form onSubmit={handleSubmit} className="feedback-form">
          <textarea
            className="feedback-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Bạn có thắc mắc hoặc góp ý gì cho thư viện? Nhập tại đây..."
            disabled={loading}
          />
          <button 
            type="submit" 
            className="feedback-submit-btn"
            disabled={loading}
          >
            {loading ? "⏳ Đang gửi..." : "🚀 Gửi phản hồi"}
          </button>
        </form>

        {/* LỊCH SỬ */}
        <h3 className="feedback-history-title">🕓 Lịch sử phản hồi của bạn</h3>
        
        {fetching ? (
            <p>⏳ Đang tải dữ liệu...</p>
        ) : feedbackHistory.length === 0 ? (
            <div className="empty-message">
                Bạn chưa gửi phản hồi nào. Hãy chia sẻ ý kiến với chúng tôi nhé!
            </div>
        ) : (
          <ul className="feedback-list">
            {feedbackHistory.map((item) => (
              <li key={item.MaPH} className="feedback-item">
                <div className="feedback-header">
                  <span className="feedback-date">
                    📅 {formatDate(item.NgayGui)}
                  </span>
                  <span className={`status-badge ${getStatusClass(item.TrangThai)}`}>
                    {item.TrangThai}
                  </span>
                </div>
                
                <div className="feedback-content">
                  {item.NoiDung}
                </div>

                {item.TenNguoiXuLy && item.TrangThai === "Đã xử lý" && (
                    <div className="admin-response">
                        ✅ Đã được xử lý bởi: <strong>{item.TenNguoiXuLy}</strong>
                    </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}