import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Navbar.css"; // ✅ Import file CSS

export default function Navbar() {
  const [userInfo, setUserInfo] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  // 🔹 Lấy thông tin user từ localStorage
  useEffect(() => {
    const loadUserInfo = () => {
      try {
        const storedUserInfo = localStorage.getItem("userInfo");
        const storedUserRole = localStorage.getItem("userRole");
        
        if (storedUserInfo) {
          setUserInfo(JSON.parse(storedUserInfo));
        }
        if (storedUserRole) {
          setUserRole(storedUserRole);
        }
      } catch (error) {
        console.error("Lỗi đọc thông tin user:", error);
      }
    };

    loadUserInfo();
    window.addEventListener('storage', loadUserInfo);
    return () => window.removeEventListener('storage', loadUserInfo);
  }, []);

  // 🔹 Hàm đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("userRole");
    setUserInfo(null);
    setUserRole(null);
    navigate("/");
    window.location.reload();
  };

  // 🔹 Hiển thị chức vụ
  const getRoleDisplay = (role) => {
    switch(role) {
      case 'Admin': return '👑 Quản trị viên';
      case 'ThuThu': return '👨‍💼 Nhân viên';
      case 'DocGia': return '👤 Độc giả';
      default: return '👤 Người dùng';
    }
  };

  return (
    <header className="navbar-container">
      {/* --- Logo & Title --- */}
      <div className="navbar-brand">
        <Link to="/" className="logo-link">
          <h1 className="logo-text">📚 Thư Viện Sách</h1>
        </Link>
        
        {userRole && (
          <span className="role-badge">
            {getRoleDisplay(userRole)}
          </span>
        )}
      </div>

      {/* --- Menu Bên Phải --- */}
      <div className="navbar-menu">
        {userInfo ? (
          // 🔹 ĐÃ ĐĂNG NHẬP
          <div className="user-section">
            <div className="user-info">
              <div className="user-name">
                👋 Xin chào, <span>{userInfo.HoTen || userInfo.TenDangNhap}</span>
              </div>
              <div className="user-email">
                {userInfo.Email || userInfo.TenDangNhap}
              </div>
            </div>

            <Link to="/profile" className="nav-btn btn-profile">
              👤 Hồ sơ
            </Link>

            <button onClick={handleLogout} className="nav-btn btn-logout">
              🚪 Đăng xuất
            </button>
          </div>
        ) : (
          // 🔹 CHƯA ĐĂNG NHẬP
          <div className="auth-buttons">
            <Link to="/login" className="nav-btn btn-login">
              🔑 Đăng Nhập
            </Link>
            <Link to="/register" className="nav-btn btn-register">
              📝 Đăng Ký
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}