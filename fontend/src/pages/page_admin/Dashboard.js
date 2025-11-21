// src/pages/page_admin/Dashboard.js
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
// ⭐️ SỬA: Chuyển sang Named Import
import { getDashboardSummary } from "../../services/adminService";
// ⭐️ IMPORT CSS MỚI
import "./Dashboard.css"; 

// ============================================================
// COMPONENT CHILD: QuickLink
// ============================================================
const QuickLink = ({ title, icon, linkTo }) => (
    <a href={linkTo} className="quick-link-button">
        <span className="quick-link-icon">{icon}</span>
        {title}
    </a>
);

// ============================================================
// COMPONENT CHILD: StatCard
// ============================================================
const StatCard = ({ title, value, icon, bgColor, linkTo }) => (
    <a href={linkTo} className="stat-card-link">
      <div className="stat-card" style={{ backgroundColor: bgColor }}>
        <div className="stat-card-header">
          <h3 className="stat-card-title">{title}</h3>
          <span className="stat-card-icon">{icon}</span>
        </div>
        <p className="stat-card-value">
          {value.toLocaleString("vi-VN")}
        </p>
        <span className="stat-card-details">Xem chi tiết →</span>
      </div>
    </a>
);

// ============================================================
// COMPONENT AdminDashboard
// ============================================================
export default function AdminDashboard() {
    const [dashboardData, setDashboardData] = useState({
        totalBooks: 0,
        currentlyBorrowed: 0,
        overdueReturns: 0,
        pendingBorrowOrders: 0,
        pendingFeedback: 0, // Cột này chưa có trong API, giữ lại 0
        totalReaders: 0,
        totalStaff: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchDashboardSummary() {
            setIsLoading(true);
            setError(null);
            try {
                // ⭐️ SỬA: Gọi hàm trực tiếp
                const response = await getDashboardSummary();
                const apiData = response.data;

                setDashboardData({
                    totalBooks: apiData.books?.TotalUniqueBooks || 0,
                    currentlyBorrowed: apiData.borrowing?.CurrentlyBorrowed || 0,
                    overdueReturns: apiData.borrowing?.OverdueBorrows || 0,
                    // Giả định PendingBorrowOrders là một trong các trường trả về từ API
                    pendingBorrowOrders: apiData.borrowing?.PendingBorrowOrders || 0, 
                    totalReaders: apiData.users?.TotalDocGia || 0,
                    totalStaff: apiData.users?.TotalThuThu || 0,
                    pendingFeedback: apiData.feedback?.PendingFeedback || 0, // Thêm pendingFeedback nếu có
                });
            } catch (err) {
                console.error("Lỗi khi tải tổng quan:", err);
                // ⭐️ ĐÃ XÓA: Loại bỏ dữ liệu mẫu mock data
                setError("Không thể tải dữ liệu từ API. Vui lòng kiểm tra kết nối dịch vụ.");
                
                // Reset về 0 nếu lỗi để UI không bị treo
                setDashboardData({
                    totalBooks: 0,
                    currentlyBorrowed: 0,
                    overdueReturns: 0,
                    pendingBorrowOrders: 0,
                    pendingFeedback: 0,
                    totalReaders: 0,
                    totalStaff: 0,
                });

            } finally {
                setIsLoading(false);
            }
        }
        fetchDashboardSummary();
    }, []);

    if (isLoading) {
        return (
            <Layout>
                <div className="loading-container">
                    <div className="spinner" />
                    Đang tải trang tổng quan...
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <h2 className="dashboard-title">
                📊 Trang Tổng quan Quản trị
            </h2>

            {error && (
                <p className="error-message">
                    ⚠️ {error}
                </p>
            )}

            <div className="stat-cards-grid">
                <StatCard 
                    title="Tổng số Sách đang Mượn" 
                    value={dashboardData.currentlyBorrowed} 
                    icon="📖" 
                    bgColor="#059669" 
                    linkTo="/admin/borrow-active" 
                />
                <StatCard 
                    title="Đơn Mượn Chờ Duyệt" 
                    value={dashboardData.pendingBorrowOrders} 
                    icon="📩" 
                    bgColor="#f97316" 
                    linkTo="/admin/borrow-orders" 
                />
                <StatCard 
                    title="Tổng số Độc giả" 
                    value={dashboardData.totalReaders} 
                    icon="👥" 
                    bgColor="#1d4ed8" 
                    linkTo="/admin/readers" 
                />
                <StatCard 
                    title="Tổng số Nhân viên" 
                    value={dashboardData.totalStaff} 
                    icon="💼" 
                    bgColor="#9333ea" 
                    linkTo="/admin/staff" 
                />
                <StatCard 
                    title="Sách Quá hạn Trả" 
                    value={dashboardData.overdueReturns} 
                    icon="🚨" 
                    bgColor="#dc2626" 
                    linkTo="/admin/borrow-return" 
                />
                <StatCard 
                    title="Tổng số Đầu sách" 
                    value={dashboardData.totalBooks} 
                    icon="📚" 
                    bgColor="#3b82f6" 
                    linkTo="/admin/books" 
                />
            </div>

            <div className="quick-links-container">
                <h3 className="quick-links-title">
                    Đường dẫn Nhanh
                </h3>
                <div className="quick-links-list">
                    <QuickLink title="Quản lý Sách" icon="📚" linkTo="/admin/books" />
                    <QuickLink title="Duyệt Đơn Mượn" icon="✅" linkTo="/admin/borrow-orders" />
                    <QuickLink title="Xử lý Trả sách/Phạt" icon="🔄" linkTo="/admin/borrow-return" />
                    <QuickLink title="Quản lý Đơn Mua" icon="📦" linkTo="/admin/purchase-orders" />
                    <QuickLink title="Quản lý Độc giả" icon="👤" linkTo="/admin/readers" />
                </div>
            </div>
        </Layout>
    );
}