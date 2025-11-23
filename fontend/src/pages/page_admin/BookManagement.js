// src/pages/page_admin/BookManagement.js
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { 
    getBooksAdmin, 
    getBookMetadata, 
    createBook, 
    updateBook, 
    deleteBook,
    createAuthorQuick,   // 👇 Import mới
    createCategoryQuick  // 👇 Import mới
} from "../../services/bookManagementService";
import "./BookManagement.css";

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

export default function BookManagement() {
    // --- STATE ---
    const [books, setBooks] = useState([]);
    const [metadata, setMetadata] = useState({ authors: [], categories: [] });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // State riêng cho file ảnh
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");

    // Form State
    const initialForm = {
        maSach: "", tenSach: "", maTG: "", maDM: "",
        giaBan: 0, soLuongTon: 0, namXuatBan: new Date().getFullYear(),
        moTa: "", donViTinh: "Cuốn", tinhTrang: "Hết", anhMinhHoa: "" 
    };
    const [formData, setFormData] = useState(initialForm);

    // --- LOAD DATA ---
    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [booksRes, metaRes] = await Promise.all([
                getBooksAdmin(),
                getBookMetadata()
            ]);
            setBooks(booksRes.data?.data || []);
            setMetadata(metaRes.data?.data || { authors: [], categories: [] });
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        } finally {
            setLoading(false);
        }
    };

    // Hàm load riêng metadata (dùng khi thêm nhanh tác giả/danh mục)
    const refreshMetadata = async () => {
        try {
            const metaRes = await getBookMetadata();
            setMetadata(metaRes.data?.data || { authors: [], categories: [] });
        } catch (error) {
            console.error("Lỗi cập nhật danh sách:", error);
        }
    };

    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file)); 
        }
    };

    // 👇 LOGIC MỚI: Thêm nhanh Tác giả / Danh mục
    const handleAddQuick = async (type) => {
        const label = type === 'author' ? "Tác giả" : "Danh mục";
        const name = window.prompt(`Nhập tên ${label} mới:`);
        
        if (name && name.trim()) {
            try {
                let res;
                if (type === 'author') {
                    res = await createAuthorQuick({ tenTG: name });
                    // Tự động chọn tác giả vừa thêm vào form
                    if(res.data?.data?.maTG) {
                        setFormData(prev => ({ ...prev, maTG: res.data.data.maTG }));
                    }
                } else {
                    res = await createCategoryQuick({ tenDM: name });
                    // Tự động chọn danh mục vừa thêm vào form
                    if(res.data?.data?.maDM) {
                        setFormData(prev => ({ ...prev, maDM: res.data.data.maDM }));
                    }
                }

                alert(`✅ Đã thêm ${label}: ${name}`);
                await refreshMetadata(); // Load lại dropdown để hiện cái mới
                
            } catch (error) {
                alert(`❌ Lỗi thêm ${label}: ` + (error.response?.data?.message || error.message));
            }
        }
    };

    const handleOpenModal = (book = null) => {
        if (book) {
            setIsEditing(true);
            setFormData({
                maSach: book.MaSach,
                tenSach: book.TenSach,
                maTG: book.MaTG,
                maDM: book.MaDM,
                giaBan: book.GiaBan,
                soLuongTon: book.SoLuongTon,
                namXuatBan: book.NamXuatBan,
                moTa: book.MoTa,
                donViTinh: book.DonViTinh,
                tinhTrang: book.TinhTrang,
                anhMinhHoa: book.AnhMinhHoa 
            });
            setPreviewUrl(book.AnhMinhHoa); 
            setSelectedFile(null); 
        } else {
            setIsEditing(false);
            setFormData(initialForm);
            setPreviewUrl("");
            setSelectedFile(null);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const dataPayload = new FormData();
        dataPayload.append("tenSach", formData.tenSach);
        dataPayload.append("maTG", formData.maTG);
        dataPayload.append("maDM", formData.maDM);
        dataPayload.append("giaBan", formData.giaBan);
        dataPayload.append("namXuatBan", formData.namXuatBan);
        dataPayload.append("moTa", formData.moTa);
        dataPayload.append("donViTinh", formData.donViTinh);
        dataPayload.append("soLuongTon", isEditing ? formData.soLuongTon : 0);
        
        if (isEditing) {
             dataPayload.append("tinhTrang", formData.tinhTrang);
             if (!selectedFile) {
                 dataPayload.append("anhMinhHoa", formData.anhMinhHoa);
             }
        }

        if (selectedFile) {
            dataPayload.append("AnhMinhHoa", selectedFile);
        }

        try {
            if (isEditing) {
                await updateBook(formData.maSach, dataPayload);
                alert("✅ Cập nhật sách thành công!");
            } else {
                await createBook(dataPayload);
                alert("✅ Thêm sách mới thành công!");
            }
            setShowModal(false);
            fetchData(); 
        } catch (error) {
            alert("❌ Lỗi: " + (error.response?.data?.message || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("⚠️ Bạn có chắc chắn muốn xóa sách này?")) {
            try {
                await deleteBook(id);
                alert("✅ Đã xóa sách.");
                fetchData();
            } catch (error) {
                alert("❌ Không thể xóa: " + (error.response?.data?.message || error.message));
            }
        }
    };

    // --- RENDER ---
    return (
        <Layout>
            <div className="book-mgmt-container">
                <div className="mgmt-header">
                    <div>
                        <h2 className="page-title">📚 Quản Lý Đầu Sách</h2>
                        <p className="sub-title">Tổng số: <b>{books.length}</b></p>
                    </div>
                    <button className="btn-add-new" onClick={() => handleOpenModal()}>+ Tạo Sách Mới</button>
                </div>

                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{width: '60px'}}>Ảnh</th>
                                <th>Thông tin Sách</th>
                                <th>Tác Giả / Danh Mục</th>
                                <th>Giá Bán</th>
                                <th>Tồn Kho</th>
                                <th style={{width: '100px'}}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center">⏳ Đang tải...</td></tr>
                            ) : books.length === 0 ? (
                                <tr><td colSpan="6" className="text-center">Chưa có sách nào.</td></tr>
                            ) : (
                                books.map(book => (
                                    <tr key={book.MaSach}>
                                        <td>
                                            <img src={book.AnhMinhHoa} alt="" className="book-thumb" onError={e => e.target.src='https://via.placeholder.com/50'} />
                                        </td>
                                        <td>
                                            <div className="book-name-cell">{book.TenSach}</div>
                                            <div className="book-code-cell">#{book.MaSach}</div>
                                        </td>
                                        <td>
                                            <div>✍️ {book.TenTG}</div>
                                            <div className="category-tag">📂 {book.TenDM}</div>
                                        </td>
                                        <td className="price-cell">{formatCurrency(book.GiaBan)}</td>
                                        <td><span className={`stock-badge ${book.SoLuongTon > 0 ? 'instock' : 'outofstock'}`}>{book.SoLuongTon}</span></td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn-icon btn-edit" onClick={() => handleOpenModal(book)}>✏️</button>
                                                <button className="btn-icon btn-delete" onClick={() => handleDelete(book.MaSach)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* MODAL FORM */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content large-modal">
                            <div className="modal-header">
                                <h3>{isEditing ? "✏️ Cập nhật Sách" : "➕ Tạo Sách Mới"}</h3>
                                <button className="btn-close-modal" onClick={() => setShowModal(false)}>&times;</button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="modal-body">
                                <div className="form-grid-layout">
                                    {/* Cột Trái */}
                                    <div className="form-col">
                                        <div className="form-group">
                                            <label>Tên Sách <span className="req">*</span></label>
                                            <input required name="tenSach" value={formData.tenSach} onChange={handleChange} />
                                        </div>
                                        
                                        <div className="form-group-row">
                                            {/* 👇 UPDATE: Dropdown Tác giả + Nút thêm nhanh */}
                                            <div className="form-group">
                                                <label>Tác Giả <span className="req">*</span></label>
                                                <div style={{display: 'flex', gap: '5px'}}>
                                                    <select required name="maTG" value={formData.maTG} onChange={handleChange} style={{flex: 1}}>
                                                        <option value="">-- Chọn --</option>
                                                        {metadata.authors.map(a => <option key={a.MaTG} value={a.MaTG}>{a.TenTG}</option>)}
                                                    </select>
                                                    <button 
                                                        type="button" 
                                                        className="btn-quick-add" 
                                                        onClick={() => handleAddQuick('author')}
                                                        title="Thêm Tác giả mới"
                                                        style={{height: '38px', width: '38px', padding: 0, cursor: 'pointer'}}
                                                    >
                                                        ➕
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 👇 UPDATE: Dropdown Danh mục + Nút thêm nhanh */}
                                            <div className="form-group">
                                                <label>Danh Mục <span className="req">*</span></label>
                                                <div style={{display: 'flex', gap: '5px'}}>
                                                    <select required name="maDM" value={formData.maDM} onChange={handleChange} style={{flex: 1}}>
                                                        <option value="">-- Chọn --</option>
                                                        {metadata.categories.map(c => <option key={c.MaDM} value={c.MaDM}>{c.TenDM}</option>)}
                                                    </select>
                                                    <button 
                                                        type="button" 
                                                        className="btn-quick-add" 
                                                        onClick={() => handleAddQuick('category')}
                                                        title="Thêm Danh mục mới"
                                                        style={{height: '38px', width: '38px', padding: 0, cursor: 'pointer'}}
                                                    >
                                                        ➕
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-group-row">
                                            <div className="form-group">
                                                <label>Giá Bán</label>
                                                <input type="number" name="giaBan" value={formData.giaBan} onChange={handleChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>Đơn Vị</label>
                                                <input name="donViTinh" value={formData.donViTinh} onChange={handleChange} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cột Phải */}
                                    <div className="form-col">
                                        <div className="form-group">
                                            <label>Ảnh Minh Họa</label>
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="file-input" />
                                            {previewUrl && (
                                                <div className="img-preview" style={{marginTop: '10px', textAlign: 'center'}}>
                                                    <img src={previewUrl} alt="Preview" style={{height: '100px', borderRadius: '5px', border: '1px solid #ccc'}} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label>Năm Xuất Bản</label>
                                            <input type="number" name="namXuatBan" value={formData.namXuatBan} onChange={handleChange} />
                                        </div>
                                        <div className="form-group disabled-group">
                                            <label>Tồn Kho (Auto)</label>
                                            <input value={formData.soLuongTon} readOnly className="read-only-input" />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group full-width">
                                    <label>Mô Tả</label>
                                    <textarea name="moTa" value={formData.moTa} onChange={handleChange} rows="3"></textarea>
                                </div>

                                <div className="form-footer">
                                    <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                                    <button type="submit" className="btn-save">{isEditing ? "Lưu Thay Đổi" : "Tạo Sách"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}