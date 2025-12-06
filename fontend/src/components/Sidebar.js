import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css"; // Đảm bảo bạn đã tạo file CSS này như hướng dẫn trước

// ============================================================
// 1. CẤU HÌNH MENU (ĐÃ BỔ SUNG ĐẦY ĐỦ)
// ============================================================

const USER_MENU = [
  // --- Mượn & Mua Sách ---
  { path: "/books", icon: "📖", label: "Danh sách Sách" }, 
  { path: "/borrow-cart", icon: "🛒", label: "Giỏ Mượn Sách" }, 
  { path: "/cart", icon: "🛍️", label: "Giỏ Hàng Mua" }, // Link tới trang giỏ hàng

  // --- Tài Chính (MỚI) ---
  { path: "/user/payments", icon: "💳", label: "Thanh Toán & Nợ" }, 
  { path: "/user/history", icon: "🕒", label: "Lịch sử Giao dịch" }, 

  // --- Lịch Sử & Cá Nhân ---
  { path: "/borrow-history", icon: "📜", label: "Lịch sử Mượn Trả" }, 
  { path: "/order-history", icon: "📦", label: "Đơn Hàng Của Tôi" }, 
  { path: "/feedback", icon: "⭐", label: "Gửi Phản Hồi" }, 
  { path: "/profile", icon: "👤", label: "Hồ Sơ Cá Nhân" }, 
];

const ADMIN_MENU = [
  // --- Tổng Quan ---
  { path: "/admin/dashboard", icon: "🏠", label: "Dashboard" }, 
  
  // --- Quản lý Sách ---
  { path: "/admin/books", icon: "📚", label: "Quản lý Sách" }, 
  { path: "/admin/book-status", icon: "📝", label: "Trạng thái Bản sao" }, 

  // --- Quản lý Mượn Trả ---
  { path: "/admin/borrow-orders", icon: "📥", label: "Duyệt Đơn Mượn" }, 
  // { path: "/admin/borrow-active", icon: "📖", label: "Sách Đang Mượn" }, // Theo dõi ai đang giữ sách
  { path: "/admin/borrow-return", icon: "🔄", label: "Xử lý Trả Sách" }, 
  { path: "/admin/return-history", icon: "📜", label: "Lịch sử Trả/Phạt" }, 

  // --- Quản lý Tài Chính ---
  { path: "/admin/purchase-orders", icon: "📦", label: "Quản lý Đơn Mua" }, 
  { path: "/admin/payments", icon: "💰", label: "Quản lý Giao dịch" }, // Trang PaymentTransactions

  // --- Hệ Thống ---
  { path: "/admin/users", icon: "👥", label: "Quản lý Độc Giả" }, 
  { path: "/admin/staff", icon: "👨‍💼", label: "Quản lý Nhân Viên" }, 
  { path: "/admin/feedback", icon: "💬", label: "Quản lý Phản Hồi" }, 
  { path: "/admin/statistics", icon: "📈", label: "Thống kê Báo cáo" }, 
];

// ============================================================
// 2. HELPER COMPONENTS
// ============================================================

const NavItem = ({ path, label, icon, isActive }) => (
  <Link to={path} className={`nav-item ${isActive ? 'active' : ''}`}>
    <span className="nav-icon">{icon}</span>
    {label}
  </Link>
);

const MenuSection = ({ title, items }) => {
  const location = useLocation();
  return (
    <div className="menu-section">
      <h3 className="menu-title">{title}</h3>
      <nav className="nav-list">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavItem 
              key={item.path} 
              {...item} 
              isActive={isActive} 
            />
          );
        })}
      </nav>
    </div>
  );
};

// ============================================================
// 3. COMPONENT CHÍNH
// ============================================================
export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(""); 

  const loadUserInfo = () => {
    const token = localStorage.getItem("token");
    const storedUserRole = localStorage.getItem("userRole");
    const storedUserInfo = localStorage.getItem("userInfo"); 
    
    if (token && storedUserRole) {
      setIsLoggedIn(true);
      setUserRole(storedUserRole);
      if (storedUserInfo) {
          try {
              const user = JSON.parse(storedUserInfo);
              setUserName(user.HoTen || "User");
          } catch (e) {}
      }
    } else {
      setIsLoggedIn(false);
      setUserRole(null);
    }
  };

  useEffect(() => {
    loadUserInfo();
    window.addEventListener('storage', loadUserInfo); 
    window.addEventListener('auth-change', loadUserInfo); 
    return () => {
        window.removeEventListener('storage', loadUserInfo);
        window.removeEventListener('auth-change', loadUserInfo);
    };
  }, [location]); 

  const handleLogout = () => {
    if(window.confirm("Bạn có muốn đăng xuất không?")) {
        localStorage.clear();
        setIsLoggedIn(false);
        setUserRole(null);
        window.dispatchEvent(new Event("auth-change"));
        navigate("/login");
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header-container">
        <h2 className="sidebar-header"> Thư Viện Nhóm 10</h2>
        {isLoggedIn && <p className="sidebar-welcome">Xin chào, {userName}</p>}
      </div>

      <div className="sidebar-content">
          {/* Menu Độc Giả */}
          {isLoggedIn && userRole === 'DocGia' && (
            <MenuSection title="👤 Chức năng Độc giả" items={USER_MENU} />
          )}

          {/* Menu Admin & Thủ thư */}
          {isLoggedIn && (userRole === 'Admin' || userRole === 'ThuThu') && (
            <MenuSection title="🛠️ Chức năng Quản trị" items={ADMIN_MENU} />
          )}

          {/* Menu Khách (Chưa đăng nhập) */}
          {!isLoggedIn && (
             <div className="menu-section">
                <h3 className="menu-title">Khách vãng lai</h3>
                <nav className="nav-list">
                   <NavItem path="/books" icon="📖" label="Tra cứu Sách" isActive={location.pathname === '/books'} />
                   <NavItem path="/login" icon="🔑" label="Đăng nhập" isActive={location.pathname === '/login'} />
                </nav>
             </div>
          )}
      </div>

      <div className="sidebar-footer">
        {isLoggedIn ? (
          <button onClick={handleLogout} className="btn btn-logout">Đăng xuất</button>
        ) : (
          <Link to="/login" className="btn btn-login">Đăng nhập ngay</Link>
        )}
      </div>
    </aside>
  );
}