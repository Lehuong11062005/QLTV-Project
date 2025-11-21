// src/pages/page_user/Register.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import authService from "../../services/authService";
import "./Register.css";

export default function Register() {
  const [formData, setFormData] = useState({
    tenDangNhap: "",
    matKhau: "",
    confirmPassword: "",
    hoTen: "",
    sdt: "",
    diaChi: ""
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    validateField(name, formData[name]);
  };

  // Kiểm tra định dạng email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Kiểm tra độ mạnh mật khẩu
  const validatePasswordStrength = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  };

  const validateField = (fieldName, value) => {
    let error = "";

    switch (fieldName) {
      case "tenDangNhap":
        if (!value.trim()) {
          error = "Tên đăng nhập (Email) không được để trống";
        } else if (!validateEmail(value)) {
          error = "Email không đúng định dạng (ví dụ: name@domain.com)";
        }
        break;

      case "matKhau":
        if (!value.trim()) {
          error = "Mật khẩu không được để trống";
        } else {
          const passwordValidation = validatePasswordStrength(value);
          if (!passwordValidation.isValid) {
            error = "Mật khẩu không đủ mạnh";
          }
        }
        break;

      case "confirmPassword":
        if (!value.trim()) {
          error = "Xác nhận mật khẩu không được để trống";
        } else if (value !== formData.matKhau) {
          error = "Mật khẩu xác nhận không khớp";
        }
        break;

      case "hoTen":
        if (!value.trim()) {
          error = "Họ và tên không được để trống";
        }
        break;

      case "sdt":
        if (!value.trim()) {
          error = "Số điện thoại không được để trống";
        } else if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(value)) {
          error = "Số điện thoại không hợp lệ. Ví dụ: 0912345678 hoặc +84912345678";
        }
        break;

      case "diaChi":
        // Địa chỉ là tùy chọn, không cần validate bắt buộc
        break;

      default:
        break;
    }

    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));

    return !error;
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Validate all fields except diaChi (optional)
    Object.keys(formData).forEach(field => {
      if (field !== "diaChi" && field !== "confirmPassword") {
        if (!validateField(field, formData[field])) {
          isValid = false;
        }
      }
    });

    // Additional check for password match
    if (formData.matKhau !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
      isValid = false;
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return isValid;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      // Tạo payload gửi đến backend - đúng với API requirement
      const payload = {
        tenDangNhap: formData.tenDangNhap,
        matKhau: formData.matKhau,
        hoTen: formData.hoTen,
        sdt: formData.sdt,
        diaChi: formData.diaChi
        // LoaiTK không cần gửi vì API sẽ tự xử lý mặc định là "DocGia"
      };

      console.log("Payload gửi đi:", payload); // Debug

      const response = await authService.register(payload);

      // Xử lý response thành công
      if (response.data) {
        const successMessage = response.data.message || "Đăng ký thành công! Vui lòng đăng nhập.";
        alert(successMessage);
        navigate("/login");
      }
    } catch (err) {
      console.error("Lỗi đăng ký:", err);
      
      // Xử lý lỗi chi tiết
      if (err.response) {
        const errorMessage = err.response.data?.message || 
                            err.response.data?.error ||
                            "Đăng ký thất bại. Vui lòng thử lại.";
        setErrors({ general: errorMessage });
      } else if (err.request) {
        setErrors({ general: "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng!" });
      } else {
        setErrors({ general: "Có lỗi xảy ra khi đăng ký!" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Hiển thị yêu cầu mật khẩu
  const renderPasswordRequirements = () => {
    const passwordValidation = validatePasswordStrength(formData.matKhau);
    
    return (
      <div className="password-requirements">
        <p>Mật khẩu phải có:</p>
        <ul>
          <li className={passwordValidation.requirements.minLength ? "valid" : "invalid"}>
            Ít nhất 8 ký tự
          </li>
          <li className={passwordValidation.requirements.hasUpperCase ? "valid" : "invalid"}>
            Ít nhất 1 chữ hoa
          </li>
          <li className={passwordValidation.requirements.hasLowerCase ? "valid" : "invalid"}>
            Ít nhất 1 chữ thường
          </li>
          <li className={passwordValidation.requirements.hasNumbers ? "valid" : "invalid"}>
            Ít nhất 1 số
          </li>
          <li className={passwordValidation.requirements.hasSpecialChar ? "valid" : "invalid"}>
            Ít nhất 1 ký tự đặc biệt
          </li>
        </ul>
      </div>
    );
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <h2>📝 Đăng ký độc giả</h2>
        
        <form onSubmit={handleRegister}>
          {errors.general && (
            <div className="error-message">
              ⚠️ {errors.general}
            </div>
          )}
          
          {/* Tên đăng nhập (Email) */}
          <div className="form-group">
            <label htmlFor="tenDangNhap">Email (Tên đăng nhập) *</label>
            <input 
              type="email" 
              id="tenDangNhap"
              name="tenDangNhap"
              value={formData.tenDangNhap} 
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Nhập email dùng làm tên đăng nhập" 
              disabled={isLoading}
              className={touched.tenDangNhap && errors.tenDangNhap ? "error" : ""}
            />
            {touched.tenDangNhap && errors.tenDangNhap && (
              <span className="error-text">{errors.tenDangNhap}</span>
            )}
          </div>

          {/* Mật khẩu */}
          <div className="form-group">
            <label htmlFor="matKhau">Mật khẩu *</label>
            <input 
              type="password" 
              id="matKhau"
              name="matKhau"
              value={formData.matKhau} 
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Nhập mật khẩu" 
              disabled={isLoading}
              className={touched.matKhau && errors.matKhau ? "error" : ""}
            />
            {touched.matKhau && errors.matKhau && <span className="error-text">{errors.matKhau}</span>}
            {formData.matKhau && renderPasswordRequirements()}
          </div>

          {/* Xác nhận mật khẩu */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
            <input 
              type="password" 
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword} 
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Nhập lại mật khẩu" 
              disabled={isLoading}
              className={touched.confirmPassword && errors.confirmPassword ? "error" : ""}
            />
            {touched.confirmPassword && errors.confirmPassword && (
              <span className="error-text">{errors.confirmPassword}</span>
            )}
          </div>

          {/* Họ và tên */}
          <div className="form-group">
            <label htmlFor="hoTen">Họ và tên *</label>
            <input 
              type="text" 
              id="hoTen"
              name="hoTen"
              value={formData.hoTen} 
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Nhập họ và tên" 
              disabled={isLoading}
              className={touched.hoTen && errors.hoTen ? "error" : ""}
            />
            {touched.hoTen && errors.hoTen && <span className="error-text">{errors.hoTen}</span>}
          </div>

          {/* Số điện thoại */}
          <div className="form-group">
            <label htmlFor="sdt">Số điện thoại *</label>
            <input 
              type="tel" 
              id="sdt"
              name="sdt"
              value={formData.sdt} 
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Nhập số điện thoại (VD: 0912345678)" 
              disabled={isLoading}
              className={touched.sdt && errors.sdt ? "error" : ""}
            />
            {touched.sdt && errors.sdt && <span className="error-text">{errors.sdt}</span>}
          </div>

          {/* Địa chỉ */}
          <div className="form-group">
            <label htmlFor="diaChi">Địa chỉ</label>
            <input 
              type="text" 
              id="diaChi"
              name="diaChi"
              value={formData.diaChi} 
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Nhập địa chỉ (tùy chọn)" 
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className="submit-btn"
          >
            {isLoading ? "⏳ Đang đăng ký..." : "🚀 Đăng ký"}
          </button>
        </form>

        <p className="login-link">
          Bạn đã có tài khoản?{" "}
          <Link to="/login" className="login-link-text">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}