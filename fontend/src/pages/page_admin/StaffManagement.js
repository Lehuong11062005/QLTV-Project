// src/pages/page_admin/StaffManagement.js
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { 
    getAllThuThu, // ⭐️ SỬA: Dùng Named Import
    addThuThu, 
    updateThuThu, 
    deleteThuThu 
} from "../../services/adminService";
import "./StaffManagement.css"; 

// ============================================================
// COMPONENT CHILD: StaffFormModal
// ============================================================
const StaffFormModal = ({ staff, roles, onSave, onClose, isSubmitting }) => {
    const initialRole = staff?.Role === 'Admin' ? 'Admin' : 'ThuThu'; 

    const [formData, setFormData] = useState(staff ? {
        ...staff,
        Role: initialRole, 
    } : {
        HoTen: '', 
        TenDangNhap: '',
        Email: '', 
        SDT: '', 
        Role: roles[0], 
        TaiKhoanTrangThai: 'HoatDong',
        MatKhau: '', 
        MatKhauMoi: '' 
    }); 
    
    const isEditMode = !!staff?.MaTT; 

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const dataToSend = {
            HoTen: formData.HoTen,
            Email: formData.Email || null,
            SDT: formData.SDT || null,
            Role: formData.Role,
            TenDangNhap: formData.TenDangNhap,
        };

        if (!isEditMode) {
            dataToSend.MatKhau = formData.MatKhau;
        } else {
            dataToSend.TaiKhoanTrangThai = formData.TaiKhoanTrangThai;
            if (formData.MatKhauMoi) {
                dataToSend.MatKhauMoi = formData.MatKhauMoi;
            }
        }
        
        if (!dataToSend.HoTen || !dataToSend.Role || !dataToSend.TenDangNhap || (!isEditMode && !dataToSend.MatKhau)) {
            alert("Vui lòng nhập đầy đủ thông tin bắt buộc.");
            return;
        }

        onSave(dataToSend, isEditMode ? formData.MaTT : null);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 style={{ borderBottom: "1px solid #ccc", paddingBottom: "10px" }}>
                    {isEditMode ? `Cập nhật Nhân viên (${formData.MaTT})` : "Thêm Nhân viên Mới"}
                </h3>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Họ tên *:</label>
                        <input type="text" name="HoTen" value={formData.HoTen} onChange={handleChange} className="form-input" required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tên đăng nhập *:</label>
                        <input type="text" name="TenDangNhap" value={formData.TenDangNhap} onChange={handleChange} className="form-input" required disabled={isEditMode} />
                    </div>

                    {!isEditMode ? (
                        <div className="form-group">
                            <label className="form-label">Mật khẩu *:</label>
                            <input type="password" name="MatKhau" value={formData.MatKhau} onChange={handleChange} className="form-input" required />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">Mật khẩu mới (tùy chọn):</label>
                            <input type="password" name="MatKhauMoi" value={formData.MatKhauMoi} onChange={handleChange} className="form-input" placeholder="Nhập mật khẩu mới" />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Vai trò *:</label>
                        <select name="Role" value={formData.Role} onChange={handleChange} className="form-input">
                            {roles.map(role => (<option key={role} value={role}>{role}</option>))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email:</label>
                        <input type="email" name="Email" value={formData.Email} onChange={handleChange} className="form-input" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Số điện thoại:</label>
                        <input type="text" name="SDT" value={formData.SDT} onChange={handleChange} className="form-input" />
                    </div>

                    {isEditMode && (
                        <div className="form-group">
                            <label className="form-label">Trạng thái Tài khoản:</label>
                            <select name="TaiKhoanTrangThai" value={formData.TaiKhoanTrangThai} onChange={handleChange} className="form-input">
                                <option value="HoatDong">Hoạt động</option>
                                <option value="BiKhoa">Khóa</option>
                            </select>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="submit" disabled={isSubmitting} className="btn-save" style={{ background: isEditMode ? "#1d4ed8" : "#16a34a" }}>
                            {isSubmitting ? 'Đang lưu...' : (isEditMode ? '💾 Cập nhật' : '➕ Thêm mới')}
                        </button>
                        <button type="button" onClick={onClose} className="btn-cancel btn-save" disabled={isSubmitting}>
                            ❌ Hủy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// ============================================================
// COMPONENT StaffManagement
// ============================================================
export default function StaffManagement() {
    const [staffList, setStaffList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStaff, setCurrentStaff] = useState(null); 

    const ROLES = ["ThuThu", "Admin"]; 

    // 1. Tải danh sách nhân viên
    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // ⭐️ SỬA: Gọi hàm trực tiếp
            const response = await getAllThuThu(); 
            setStaffList(response.data); 
        } catch (err) {
            console.error("Lỗi tải nhân viên:", err);
            setError("Không thể tải danh sách Thủ thư từ CSDL. Vui lòng kiểm tra kết nối API.");
            setStaffList([]);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Mở modal Thêm/Sửa
    const handleOpenModal = (staff = null) => {
        setCurrentStaff(staff ? { 
            ...staff,
            MatKhauMoi: '' 
        } : { 
            HoTen: '', 
            TenDangNhap: '',
            Email: '', 
            SDT: '', 
            Role: ROLES[0], 
            TaiKhoanTrangThai: 'HoatDong', 
            MatKhau: '' 
        });
        setIsModalOpen(true);
    };

    // 3. Thêm/Sửa nhân viên
    const handleSaveStaff = async (staffData, maTT) => {
        const isEditMode = !!maTT; 
        
        setIsSubmitting(true);
        setError(null);

        try {
            if (isEditMode) {
                // ⭐️ SỬA: Gọi hàm trực tiếp
                await updateThuThu(maTT, staffData);
                let msg = `Đã CẬP NHẬT thông tin (MaTT: ${maTT}).`;
                if (staffData.MatKhauMoi) {
                    msg = `Đã CẬP NHẬT & ĐẶT LẠI mật khẩu cho (MaTT: ${maTT}).`;
                }
                alert(msg);
            } else {
                // ⭐️ SỬA: Gọi hàm trực tiếp
                await addThuThu(staffData);
                alert(`Đã tạo Nhân viên mới: ${staffData.TenDangNhap}`);
            }
            
            setIsModalOpen(false);
            await fetchStaff(); 
        } catch (err) {
            console.error("Lỗi Lưu nhân viên:", err);
            setError(err.response?.data?.message || 'Lỗi khi lưu thủ thư. Vui lòng kiểm tra tên đăng nhập/email.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 4. Xóa nhân viên
    const handleDelete = async (MaTT, HoTen) => { 
        if (!window.confirm(`Bạn có chắc muốn XÓA Thủ thư "${HoTen}" (Mã: ${MaTT})? Hành động này sẽ xóa cả tài khoản liên quan.`)) return;
        
        setIsSubmitting(true);
        setError(null);

        try {
            // ⭐️ SỬA: Gọi hàm trực tiếp
            await deleteThuThu(MaTT); 
            setStaffList(staffList.filter((s) => s.MaTT !== MaTT)); 
            alert(`Đã xóa Thủ thư "${HoTen}" thành công.`);
        } catch (err) {
            console.error("Lỗi xóa nhân viên:", err);
            alert(err.response?.data?.message || 'Không thể xóa do ràng buộc CSDL. Nhân viên này có thể đã tạo phiếu mượn/trả.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const getStatusStyle = (status) => {
        return status === "HoatDong" ? "status-active" : "status-inactive";
    };

    if (isLoading) {
        return <Layout><h2 style={{color: '#3b82f6'}}>Đang tải dữ liệu Thủ thư từ CSDL...</h2></Layout>;
    }

    return (
        <Layout>
            <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "10px" }}>
                💼 Quản lý Nhân viên (Thủ thư, Admin)
            </h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p>Tổng số Nhân viên: <span style={{fontWeight: 'bold', color: '#1f2937'}}>{staffList.length}</span></p>
                <button
                    onClick={() => handleOpenModal()}
                    className="btn-primary btn-add-staff"
                    disabled={isSubmitting}
                >
                    ➕ Thêm Nhân viên Mới
                </button>
            </div>
            {error && <p style={{ color: '#dc2626', marginBottom: '15px' }}>{error}</p>}

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Mã NV</th>
                        <th>Họ tên</th>
                        <th>Tên đăng nhập</th>
                        <th>Vai trò</th>
                        <th>Email/SĐT</th>
                        <th>Trạng thái TK</th>
                        <th style={{ textAlign: "center" }}>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {staffList.length === 0 ? (
                         <tr>
                             <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                                 Không tìm thấy nhân viên nào.
                             </td>
                         </tr>
                    ) : (
                        staffList.map((staff) => (
                            <tr key={staff.MaTT}> 
                                <td>{staff.MaTT}</td>
                                <td style={{ fontWeight: '500' }}>{staff.HoTen}</td>
                                <td>{staff.TenDangNhap}</td>
                                <td>{staff.Role}</td> 
                                <td>{staff.Email} / {staff.SDT}</td>
                                <td>
                                    <span className={getStatusStyle(staff.TaiKhoanTrangThai)}>{staff.TaiKhoanTrangThai}</span>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                    <button onClick={() => handleOpenModal(staff)} disabled={isSubmitting} className="btn-edit">✏️ Sửa</button>
                                    <button onClick={() => handleDelete(staff.MaTT, staff.HoTen)} disabled={isSubmitting} className="btn-delete">🗑️ Xóa</button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            
            {isModalOpen && (
                <StaffFormModal 
                    staff={currentStaff}
                    roles={ROLES}
                    onSave={handleSaveStaff}
                    onClose={() => setIsModalOpen(false)}
                    isSubmitting={isSubmitting}
                />
            )}
        </Layout>
    );
}