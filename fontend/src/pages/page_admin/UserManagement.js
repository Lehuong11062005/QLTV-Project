// src/pages/page_admin/UserManagement.js
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { 
    getAllDocGia,        // ⭐️ SỬA: Dùng Named Import
    addDocGia, 
    updateDocGia, 
    updateDocGiaStatus 
} from "../../services/adminService"; // Import các hàm trực tiếp
import "./UserManagement.css"; 

// ============================================================
// COMPONENT CHILD: ReaderFormModal
// ============================================================
const ReaderFormModal = ({ reader, onSave, onClose, isSubmitting }) => {
    const [formData, setFormData] = useState(reader);
    const isEditMode = !!reader?.MaDG;

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
            DiaChi: formData.DiaChi || null,
        };

        if (!isEditMode) {
            dataToSend.TenDangNhap = formData.TenDangNhap;
            dataToSend.MatKhau = formData.MatKhau;
        }

        // Cập nhật/Thêm mới độc giả
        onSave(dataToSend, isEditMode ? formData.MaDG : null);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 style={{ borderBottom: "1px solid #ccc", paddingBottom: "10px" }}>
                    {isEditMode ? `Cập nhật Độc giả (${formData.MaDG})` : "Thêm Độc giả Mới"}
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

                    {!isEditMode && (
                        <div className="form-group">
                            <label className="form-label">Mật khẩu *:</label>
                            <input type="password" name="MatKhau" value={formData.MatKhau} onChange={handleChange} className="form-input" required />
                        </div>
                    )}
                    
                    <div className="form-group">
                        <label className="form-label">Email:</label>
                        <input type="email" name="Email" value={formData.Email} onChange={handleChange} className="form-input" />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Số điện thoại:</label>
                        <input type="text" name="SDT" value={formData.SDT} onChange={handleChange} className="form-input" /> 
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Địa chỉ:</label>
                        <textarea name="DiaChi" value={formData.DiaChi} onChange={handleChange} className="form-input" style={{ height: '60px'}} />
                    </div>

                    <div className="modal-actions">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-save"
                            style={{ background: isEditMode ? "#1d4ed8" : "#16a34a" }}
                        >
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
// COMPONENT UserManagement
// ============================================================
export default function UserManagement() {
    const [readerList, setReaderList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentReader, setCurrentReader] = useState(null); 
    const [filterStatus, setFilterStatus] = useState('all'); 

    // 1. Tải danh sách độc giả từ CSDL
    useEffect(() => {
        fetchReaders(filterStatus);
    }, [filterStatus]);

    const fetchReaders = async (status) => {
        setIsLoading(true);
        setError(null);
        try {
            // ⭐️ SỬA: Gọi hàm trực tiếp
            const response = await getAllDocGia(); 
            setReaderList(response.data); 
        } catch (err) {
            console.error("Lỗi tải độc giả:", err);
            setError("Không thể tải danh sách Độc giả từ CSDL. Vui lòng kiểm tra kết nối API.");
            setReaderList([]);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Xử lý Mở Modal Thêm/Sửa
    const handleOpenModal = (reader = null) => {
        setCurrentReader(reader || { 
            HoTen: '', 
            TenDangNhap: '',
            Email: '', 
            SDT: '', 
            DiaChi: '',
            MatKhau: '' 
        });
        setIsModalOpen(true);
    };

    // 3. Xử lý Thêm/Sửa độc giả (CRUD)
    const handleSaveReader = async (readerData, maDG) => {
        const isEditMode = !!maDG;
        
        setIsSubmitting(true);
        setError(null);

        try {
            if (isEditMode) {
                // ⭐️ SỬA: Gọi hàm trực tiếp
                await updateDocGia(maDG, readerData);
                alert(`Đã cập nhật thông tin Độc giả: ${readerData.HoTen}`);
            } else {
                // ⭐️ SỬA: Gọi hàm trực tiếp
                await addDocGia(readerData);
                alert(`Đã tạo tài khoản Độc giả mới: ${readerData.TenDangNhap}`);
            }
            
            setIsModalOpen(false);
            await fetchReaders(filterStatus); 

        } catch (err) {
            console.error("Lỗi Lưu độc giả:", err);
            setError(err.response?.data?.message || 'Lỗi khi lưu độc giả. Vui lòng kiểm tra API (ví dụ: Tên đăng nhập đã tồn tại).');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 4. Xử lý Khóa/Kích hoạt Thẻ độc giả (Trạng thái Thẻ)
    const handleToggleStatus = async (MaDG, TrangThaiHienTai) => {
        const currentActiveStatus = TrangThaiHienTai === 'Hoạt động' ? 'Hoạt động' : 'Khóa';
        const newStatusForController = currentActiveStatus === 'Hoạt động' ? 'Khóa' : 'Hoạt động';
        
        if (!window.confirm(`Bạn có chắc chắn muốn ${newStatusForController === 'Khóa' ? 'KHÓA' : 'KÍCH HOẠT'} thẻ độc giả "${MaDG}"?`)) {
            return;
        }
        
        setIsSubmitting(true);
        try {
            // ⭐️ SỬA: Gọi hàm trực tiếp
            await updateDocGiaStatus(MaDG, { TrangThaiThe: newStatusForController });
            
            setReaderList(readerList.map(r => 
                r.MaDG === MaDG ? { ...r, TrangThaiThe: newStatusForController } : r
            ));
            alert(`Đã ${newStatusForController === 'Khóa' ? 'Khóa' : 'Kích hoạt'} thẻ độc giả ${MaDG} thành công.`);
            
        } catch (err) {
            console.error("Lỗi cập nhật trạng thái:", err);
            setError(err.response?.data?.message || 'Không thể cập nhật trạng thái thẻ.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Hàm hỗ trợ style trạng thái mượn
    const getBorrowStatusStyle = (status) => {
        switch (status) {
            case "Quá hạn trả": return { color: "#dc2626", fontWeight: "bold" };
            case "Còn hạn": return { color: "#16a34a", fontWeight: "bold" };
            case "Đang mượn": return { color: "#f59e0b", fontWeight: "bold" };
            case "Hết hạn mượn": return { color: "#9d174d", fontWeight: "bold" };
            default: return {};
        }
    };

    // Hàm hỗ trợ style trạng thái thẻ (badge)
    const getCardStatusClass = (status) => {
        switch (status) {
            case "Khóa": 
            case "Hết hạn thẻ":
                return "card-status-locked";
            case "Hoạt động": 
            case "ConHan": 
                return "card-status-active";
            default: return "card-status-other";
        }
    };


    if (isLoading) {
        return <Layout><h2 style={{color: '#3b82f6'}}>Đang tải dữ liệu Độc giả...</h2></Layout>;
    }

    // Lọc dữ liệu trên client dựa trên filterStatus (nếu API không hỗ trợ server-side filter)
    const filteredReaders = readerList.filter(reader => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'overdue') return reader.TrangThaiMuon === 'Quá hạn trả';
        if (filterStatus === 'expired') return reader.TrangThaiMuon === 'Hết hạn mượn';
        if (filterStatus === 'borrowing') return reader.TrangThaiMuon !== 'Không mượn';
        if (filterStatus === 'active') return reader.TrangThaiMuon === 'Còn hạn' || reader.TrangThaiMuon === 'Không mượn';
        return true;
    });


    return (
        <Layout>
            <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "10px" }}>
                👥 Quản lý Độc giả (User Management - Bảng DocGia)
            </h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <p>Tổng số độc giả: <span style={{fontWeight: 'bold', color: '#1f2937'}}>{filteredReaders.length}</span></p>
                    <label style={{ fontWeight: 'bold' }}>Lọc Trạng thái Mượn:</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: "4px", border: "1px solid #ccc" }}
                        disabled={isSubmitting}
                    >
                        <option value="all">Tất cả</option>
                        <option value="active">Còn hạn</option>
                        <option value="overdue">Quá hạn trả</option>
                        <option value="expired">Hết hạn mượn</option> 
                        <option value="borrowing">Đang mượn</option>
                    </select>
                </div>
                
                <button
                    onClick={() => handleOpenModal()}
                    className="btn-primary"
                    disabled={isSubmitting}
                >
                    ➕ Thêm Độc giả Mới
                </button>
            </div>
            {error && <p style={{ color: '#dc2626', marginBottom: '15px' }}>{error}</p>}

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Mã ĐG</th>
                        <th>Họ tên</th>
                        <th>Email/SĐT</th>
                        <th>Sách đang mượn</th>
                        <th>Trạng thái Mượn</th>
                        <th>Trạng thái Thẻ</th>
                        <th style={{ width: '180px', textAlign: 'center' }}>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredReaders.length === 0 ? (
                         <tr>
                             <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                                 Không tìm thấy độc giả nào phù hợp với bộ lọc.
                             </td>
                         </tr>
                    ) : (
                        filteredReaders.map((reader) => (
                            <tr key={reader.MaDG}>
                                <td>{reader.MaDG}</td>
                                <td style={{ fontWeight: '500' }}>{reader.HoTen}</td>
                                <td>{reader.Email} / {reader.SDT}</td>
                                <td>{reader.SoSachDangMuon || 0}</td>
                                <td>
                                    <span style={getBorrowStatusStyle(reader.TrangThaiMuon)}>
                                        {reader.TrangThaiMuon || 'Không mượn'}
                                    </span>
                                </td>
                                <td>
                                    <span className={getCardStatusClass(reader.TrangThaiThe)}>
                                        {reader.TrangThaiThe}
                                    </span>
                                </td>
                                <td style={{ textAlign: "center", width: '180px' }}>
                                    <button
                                        onClick={() => handleOpenModal(reader)}
                                        disabled={isSubmitting}
                                        className="btn-edit"
                                    >
                                        ✏️ Sửa
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(reader.MaDG, reader.TrangThaiThe)}
                                        disabled={isSubmitting}
                                        className="btn-toggle-status"
                                        style={{ background: (reader.TrangThaiThe === 'Hoạt động') ? "#dc2626" : "#16a34a"}}
                                    >
                                        {(reader.TrangThaiThe === 'Hoạt động') ? '🔒 Khóa Thẻ' : '🔓 Kích Hoạt'}
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            
            {isModalOpen && (
                <ReaderFormModal 
                    reader={currentReader}
                    onSave={handleSaveReader}
                    onClose={() => setIsModalOpen(false)}
                    isSubmitting={isSubmitting}
                />
            )}
        </Layout>
    );
}