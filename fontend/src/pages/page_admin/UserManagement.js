// src/pages/page_admin/UserManagement.js
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { 
    getAllDocGia, 
    addDocGia, 
    updateDocGia, 
    updateDocGiaStatus 
} from "../../services/adminService"; 
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
// COMPONENT MAIN: UserManagement
// ============================================================
export default function UserManagement() {
    const [readerList, setReaderList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentReader, setCurrentReader] = useState(null); 
    
    // State cho bộ lọc
    const [filterStatus, setFilterStatus] = useState('all'); 
    // ⭐️ MỚI: State cho ô tìm kiếm
    const [searchTerm, setSearchTerm] = useState(''); 

    // 1. Tải danh sách độc giả từ CSDL
    useEffect(() => {
        fetchReaders();
    }, []); // Chỉ tải 1 lần lúc đầu, sau đó client tự filter

    const fetchReaders = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getAllDocGia(); 
            setReaderList(response.data); 
        } catch (err) {
            console.error("Lỗi tải độc giả:", err);
            setError("Không thể tải danh sách Độc giả. Vui lòng kiểm tra API.");
            setReaderList([]);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Mở Modal
    const handleOpenModal = (reader = null) => {
        setCurrentReader(reader || { 
            HoTen: '', TenDangNhap: '', Email: '', SDT: '', DiaChi: '', MatKhau: '' 
        });
        setIsModalOpen(true);
    };

    // 3. Lưu (Thêm/Sửa)
    const handleSaveReader = async (readerData, maDG) => {
        const isEditMode = !!maDG;
        setIsSubmitting(true);
        setError(null);

        try {
            if (isEditMode) {
                await updateDocGia(maDG, readerData);
                alert(`Đã cập nhật: ${readerData.HoTen}`);
            } else {
                await addDocGia(readerData);
                alert(`Đã tạo mới: ${readerData.TenDangNhap}`);
            }
            setIsModalOpen(false);
            await fetchReaders(); 
        } catch (err) {
            console.error("Lỗi Lưu:", err);
            setError(err.response?.data?.message || 'Lỗi khi lưu dữ liệu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 4. Khóa/Mở khóa thẻ
    const handleToggleStatus = async (MaDG, TrangThaiHienTai) => {
        const isLocked = TrangThaiHienTai === 'Khóa' || TrangThaiHienTai === 'Hết hạn thẻ';
        const newStatus = isLocked ? 'Hoạt động' : 'Khóa';
        
        if (!window.confirm(`Bạn muốn ${newStatus === 'Khóa' ? 'KHÓA' : 'KÍCH HOẠT'} độc giả "${MaDG}"?`)) return;
        
        setIsSubmitting(true);
        try {
            await updateDocGiaStatus(MaDG, { TrangThaiThe: newStatus });
            setReaderList(readerList.map(r => r.MaDG === MaDG ? { ...r, TrangThaiThe: newStatus } : r));
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Style hỗ trợ
    const getBorrowStatusStyle = (status) => {
        switch (status) {
            case "Quá hạn trả": return { color: "#dc2626", fontWeight: "bold" };
            case "Đang mượn": return { color: "#f59e0b", fontWeight: "bold" };
            case "Không mượn": return { color: "#10b981", fontWeight: "bold" };
            default: return { color: "#6b7280" };
        }
    };

    const getCardStatusClass = (status) => {
    // Chuẩn hóa input để tránh lỗi font chữ hoa/thường
    const s = status ? status.toLowerCase() : '';

    if (s.includes('hoạt động') || s.includes('hoatdong')) {
        return "status-badge status-active"; // 🟢 Xanh lá
    }
    if (s.includes('conhan') || s.includes('còn hạn')) {
        return "status-badge status-valid";  // 🔵 Xanh dương
    }
    if (s.includes('chokichhoat') || s.includes('chờ kích hoạt')) {
        return "status-badge status-pending"; // 🟠 Cam
    }
    if (s.includes('khóa') || s.includes('khoa') || s.includes('hết hạn')) {
        return "status-badge status-locked";  // 🔴 Đỏ
    }
    
    return "status-badge status-default"; // Mặc định màu xám
};

    // --- ⭐️ LOGIC LỌC DỮ LIỆU (Client-side) ---
    const filteredReaders = readerList.filter(reader => {
        const status = reader.TrangThaiMuon; 
        
        // 1. Lọc theo trạng thái Dropdown
        let matchStatus = false;
        if (filterStatus === 'all') matchStatus = true;
        else if (filterStatus === 'overdue') matchStatus = status === 'Quá hạn trả';
        else if (filterStatus === 'borrowing') matchStatus = status === 'Đang mượn' || status === 'Quá hạn trả';
        else if (filterStatus === 'active') matchStatus = status === 'Không mượn';

        // 2. Lọc theo ô Tìm kiếm (Mã ĐG hoặc Họ Tên)
        // Chuyển hết về chữ thường để tìm kiếm không phân biệt hoa/thường
        const lowerTerm = searchTerm.toLowerCase();
        const matchSearch = 
            (reader.MaDG && reader.MaDG.toLowerCase().includes(lowerTerm)) || 
            (reader.HoTen && reader.HoTen.toLowerCase().includes(lowerTerm));

        // Kết hợp cả 2 điều kiện
        return matchStatus && matchSearch;
    });

    if (isLoading) return <Layout><h2 style={{color: '#3b82f6'}}>Đang tải dữ liệu...</h2></Layout>;

    return (
        <Layout>
            <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "10px" }}>
                👥 Quản lý Độc giả
            </h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    
                    {/* Ô TÌM KIẾM MỚI */}
                    <div style={{position: 'relative'}}>
                        <input 
                            type="text" 
                            placeholder="🔍 Tìm Mã ĐG hoặc Họ tên..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: "8px 12px", 
                                borderRadius: "4px", 
                                border: "1px solid #9ca3af",
                                width: "250px"
                            }}
                        />
                        {searchTerm && (
                            <span 
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
                                    cursor: 'pointer', color: '#999', fontWeight: 'bold'
                                }}
                            >✕</span>
                        )}
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Không nợ sách</option>
                        <option value="borrowing">Đang mượn sách</option>
                        <option value="overdue">Đang quá hạn</option>
                    </select>

                    <div style={{fontWeight: '500', color: '#4b5563'}}>
                        Kết quả: <b>{filteredReaders.length}</b>
                    </div>
                </div>
                
                <button onClick={() => handleOpenModal()} className="btn-primary" disabled={isSubmitting}>
                    ➕ Thêm Độc giả
                </button>
            </div>

            {error && <p style={{ color: '#dc2626' }}>{error}</p>}

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Mã ĐG</th>
                        <th>Thông tin cá nhân</th>
                        <th>Liên hệ</th>
                        <th style={{textAlign: 'center'}}>Sách đang giữ</th>
                        <th>Trạng thái Mượn</th>
                        <th>Trạng thái Thẻ</th>
                        <th style={{ textAlign: 'center' }}>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredReaders.length === 0 ? (
                        <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px', color: '#888'}}>
                            Không tìm thấy độc giả nào khớp với từ khóa "{searchTerm}"
                        </td></tr>
                    ) : (
                        filteredReaders.map((reader) => (
                            <tr key={reader.MaDG}>
                                {/* Highlight từ khóa tìm kiếm trong Mã ĐG nếu cần, ở đây để text thường */}
                                <td style={{fontWeight: 'bold', color: '#2563eb'}}>{reader.MaDG}</td>
                                
                                <td>
                                    <div style={{fontWeight: 'bold'}}>{reader.HoTen}</div>
                                    <div style={{fontSize: '12px', color: '#666'}}>@{reader.TenDangNhap || '---'}</div>
                                </td>

                                <td>
                                    <div>{reader.Email}</div>
                                    <div style={{fontSize: '12px'}}>{reader.SDT}</div>
                                </td>

                                <td style={{textAlign: 'center', fontWeight: 'bold', fontSize: '16px'}}>
                                    {reader.SoSachDangMuon}
                                </td>

                                <td>
                                    <span style={getBorrowStatusStyle(reader.TrangThaiMuon)}>
                                        {reader.TrangThaiMuon}
                                    </span>
                                </td>

                                <td>
                                    <span className={getCardStatusClass(reader.TrangThaiThe)}>
                                        {reader.TrangThaiThe}
                                    </span>
                                </td>
                                
                                <td style={{ textAlign: "center", display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                    <button 
                                        className="btn-edit" 
                                        onClick={() => handleOpenModal(reader)}
                                        disabled={isSubmitting}
                                    >
                                        ✏️ Sửa
                                    </button>
                                    
                                    <button
                                        onClick={() => handleToggleStatus(reader.MaDG, reader.TrangThaiThe)}
                                        disabled={isSubmitting}
                                        className="btn-toggle-status"
                                        style={{ 
                                            background: (reader.TrangThaiThe === 'Hoạt động' || reader.TrangThaiThe === 'ConHan') ? "#dc2626" : "#16a34a",
                                            color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
                                        }}
                                    >
                                        {(reader.TrangThaiThe === 'Hoạt động' || reader.TrangThaiThe === 'ConHan') ? '🔒 Khóa' : '🔓 Mở'}
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