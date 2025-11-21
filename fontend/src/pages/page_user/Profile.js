// src/pages/page_user/Profile.js
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import authService from "../../services/authService"; 
import "./Profile.css";

export default function Profile() {
  const [user, setUser] = useState({
    HoTen: "",
    Email: "",
    SDT: "",
    DiaChi: "",
    TenDangNhap: "",
    MaTK: "",
    LoaiTK: "",
    MaDG: "",
    TrangThaiThe: "",
    NgayHetHanThe: "",
    MaTT: "",
    Role: ""
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);

  const fetchUserProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await authService.getProfile();
      
      if (response && response.data) {
        console.log("Profile data from API:", response.data);
        setUser(response.data);
        localStorage.setItem("userInfo", JSON.stringify(response.data));
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin profile:", error);
      try {
        const localUser = localStorage.getItem("userInfo");
        if (localUser) {
          setUser(JSON.parse(localUser));
        }
      } catch (localError) {
        console.error("Lỗi đọc localStorage:", localError);
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch {
      return dateString; 
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser(prev => ({ ...prev, [name]: value }));
    setUpdateMessage(null);
  };

  const handleCancelEdit = () => {
    fetchUserProfile();
    setIsEditing(false);
    setUpdateMessage(null);
  };

  // Trong hàm handleUpdateProfile, sửa dòng này:
const handleUpdateProfile = async () => {
  if (!user.HoTen.trim()) {
    setUpdateMessage({ type: 'error', text: '❌ Họ tên không được để trống.' });
    return;
  }

  if (user.SDT && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(user.SDT)) {
    setUpdateMessage({ type: 'error', text: '❌ Số điện thoại không hợp lệ.' });
    return;
  }

  setLoadingProfile(true);

  try {
    const payload = {
      HoTen: user.HoTen.trim(),
      SDT: user.SDT ? user.SDT.trim() : "",
      DiaChi: user.DiaChi ? user.DiaChi.trim() : "",
    };

    // Sửa dòng này - xóa biến response không sử dụng
    await authService.updateProfile(payload);
    
    const updatedUser = { ...user, ...payload };
    setUser(updatedUser);
    localStorage.setItem("userInfo", JSON.stringify(updatedUser));
    
    setIsEditing(false);
    setUpdateMessage({ 
      type: 'success', 
      text: '✅ Cập nhật thông tin thành công!' 
    });

  } catch (error) {
    console.error("Lỗi khi cập nhật:", error);
    const errorMessage = error.response?.data?.message || '❌ Có lỗi xảy ra khi cập nhật.';
    setUpdateMessage({ type: 'error', text: errorMessage });
  } finally {
    setLoadingProfile(false);
  }
};
  const getStatusInfo = (trangThai) => {
    switch(trangThai) {
      case 'ConHan':
        return { text: '🟢 Còn hạn', className: 'status-active' };
      case 'HetHan':
        return { text: '🔴 Hết hạn', className: 'status-expired' };
      case 'Khoa':
        return { text: '🟡 Bị khóa', className: 'status-locked' };
      default:
        return { text: '⚪ Không xác định', className: 'status-unknown' };
    }
  };

  const statusInfo = getStatusInfo(user.TrangThaiThe);
  const isDocGia = user.LoaiTK === 'DocGia';
  const isThuThu = user.LoaiTK === 'ThuThu' || user.LoaiTK === 'Admin';

  if (loadingProfile && !user.MaTK) {
    return (
      <Layout>
        <div className="profile-container">
          <div className="profile-info-box">
            <div className="profile-loading">
              <div className="profile-spinner"></div>
              <p className="loading-text">Đang tải thông tin...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {user.HoTen ? user.HoTen.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <div className="profile-title-section">
            <h1 className="profile-title">
              {user.HoTen || "Người dùng"}
            </h1>
            <div className="profile-badges">
              {isThuThu && (
                <span className={`profile-badge ${user.LoaiTK === 'Admin' ? 'badge-admin' : 'badge-thuthu'}`}>
                  {user.LoaiTK === 'Admin' ? '👑 Quản trị viên' : '📚 Thủ thư'}
                </span>
              )}
              {isDocGia && (
                <span className="profile-badge badge-docgia">
                  👤 Độc giả
                </span>
              )}
            </div>
          </div>
        </div>

        {updateMessage && (
          <div className={`profile-message ${
            updateMessage.type === 'success' ? 'message-success' : 'message-error'
          }`}>
            {updateMessage.text}
          </div>
        )}

        {/* THÔNG TIN CÁ NHÂN */}
        <div className="profile-info-box">
          <div className="profile-section-header">
            <h3 className="profile-section-title">
              <span className="section-icon">👤</span>
              Thông tin cá nhân
            </h3>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="profile-button btn-edit"
              >
                <span className="btn-icon">✏️</span>
                Chỉnh sửa
              </button>
            )}
          </div>
          
          <div className="profile-grid">
            <div className="profile-field">
              <label className="profile-label">Mã độc giả:</label>
              <div className="profile-value muted">
                {user.MaDG || "N/A"}
              </div>
            </div>
            
            <div className="profile-field">
              <label className="profile-label">Tên đăng nhập:</label>
              <div className="profile-value muted">
                {user.TenDangNhap || "N/A"}
              </div>
            </div>
            
            <div className="profile-field">
              <label className="profile-label">Email:</label>
              <div className="profile-value muted">
                {user.Email || "N/A"}
              </div>
              <div className="profile-help">
                Liên hệ quản trị viên để thay đổi
              </div>
            </div>

            <div className="profile-field">
              <label className="profile-label">Họ và tên:</label>
              {isEditing ? (
                <input 
                  type="text" 
                  name="HoTen" 
                  value={user.HoTen} 
                  onChange={handleChange} 
                  className="profile-input"
                  placeholder="Nhập họ và tên"
                  autoFocus
                />
              ) : (
                <div className="profile-value">
                  {user.HoTen || "Chưa cập nhật"}
                </div>
              )}
            </div>
            
            <div className="profile-field">
              <label className="profile-label">Số điện thoại:</label>
              {isEditing ? (
                <input 
                  type="tel" 
                  name="SDT" 
                  value={user.SDT} 
                  onChange={handleChange} 
                  className="profile-input"
                  placeholder="Nhập số điện thoại"
                />
              ) : (
                <div className="profile-value">
                  {user.SDT || "Chưa cập nhật"}
                </div>
              )}
            </div>

            {isDocGia && (
              <div className="profile-field full-width">
                <label className="profile-label">Địa chỉ:</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    name="DiaChi" 
                    value={user.DiaChi} 
                    onChange={handleChange} 
                    className="profile-input"
                    placeholder="Nhập địa chỉ"
                  />
                ) : (
                  <div className="profile-value">
                    {user.DiaChi || "Chưa cập nhật"}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {isEditing && (
            <div className="profile-actions">
              <button
                onClick={handleCancelEdit}
                className="profile-button btn-cancel"
              >
                <span className="btn-icon">↩️</span>
                Hủy bỏ
              </button>
              
              <button
                onClick={handleUpdateProfile}
                disabled={loadingProfile}
                className="profile-button btn-save"
              >
                <span className="btn-icon">
                  {loadingProfile ? '⏳' : '💾'}
                </span>
                {loadingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          )}
        </div>
        
        {/* THÔNG TIN THẺ THƯ VIỆN (chỉ Độc giả) */}
        {isDocGia && (
          <div className="profile-info-box">
            <h3 className="profile-section-title">
              <span className="section-icon">💳</span>
              Thông tin Thẻ Thư viện
            </h3>
            <div className="profile-grid">
              <div className="profile-field">
                <label className="profile-label">Ngày hết hạn:</label>
                <div className="profile-value muted">
                  {formatDate(user.NgayHetHanThe)}
                </div>
              </div>
              
              <div className="profile-field">
                <label className="profile-label">Trạng thái thẻ:</label>
                <div className="profile-value">
                  <span className={`status-tag ${statusInfo.className}`}>
                    {statusInfo.text}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug info (chỉ development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="profile-info-box debug-box">
            <h3 className="debug-title">🔧 Debug Info</h3>
            <div className="debug-content">
              <div>Trạng thái thẻ từ API: "{user.TrangThaiThe}"</div>
              <div>Dữ liệu từ localStorage: {localStorage.getItem("userInfo") ? '✅' : '❌'}</div>
              <div>User Role: {user.LoaiTK || 'N/A'}</div>
              <pre>
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}