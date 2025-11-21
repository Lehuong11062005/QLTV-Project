import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { 
    getBooksAdmin, 
    getBookMetadata, 
    createBook, 
    updateBook, 
    deleteBook 
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
    
    // Form State
    const initialForm = {
        maSach: "",
        tenSach: "",
        maTG: "",
        maDM: "",
        giaBan: 0,
        soLuongTon: 0, // Mặc định 0
        namXuatBan: new Date().getFullYear(),
        moTa: "",
        anhMinhHoa: "",
        donViTinh: "Cuốn",
        tinhTrang: "Hết" // Mặc định Hết khi tạo mới
    };
    const [formData, setFormData] = useState(initialForm);

    // --- LOAD DATA ---
    useEffect(() => {
        fetchData();
    }, []);

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
            alert("Không thể tải dữ liệu sách. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
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
                anhMinhHoa: book.AnhMinhHoa,
                donViTinh: book.DonViTinh,
                tinhTrang: book.TinhTrang
            });
        } else {
            setIsEditing(false);
            setFormData(initialForm);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Nếu tạo mới, ép số lượng về 0 để bắt buộc nhập kho bên Status
            const payload = isEditing ? formData : { ...formData, soLuongTon: 0 };

            if (isEditing) {
                await updateBook(formData.maSach, payload);
                alert("✅ Cập nhật thông tin sách thành công!");
            } else {
                await createBook(payload);
                alert("✅ Tạo đầu sách mới thành công! Vui lòng sang trang 'Quản lý Bản sao' để nhập kho.");
            }
            setShowModal(false);
            fetchData(); 
        } catch (error) {
            alert("❌ Lỗi: " + (error.response?.data?.message || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("⚠️ Bạn có chắc chắn muốn xóa sách này? Hành động này không thể hoàn tác.")) {
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
                {/* HEADER */}
                <div className="mgmt-header">
                    <div>
                        <h2 className="page-title">📚 Quản Lý Đầu Sách (Catalog)</h2>
                        <p className="sub-title">Tổng số đầu sách: <b>{books.length}</b></p>
                    </div>
                    <button className="btn-add-new" onClick={() => handleOpenModal()}>
                        + Tạo Đầu Sách Mới
                    </button>
                </div>

                {/* TABLE */}
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
                                <tr><td colSpan="6" className="text-center loading-text">⏳ Đang tải dữ liệu...</td></tr>
                            ) : books.length === 0 ? (
                                <tr><td colSpan="6" className="text-center empty-text">Chưa có sách nào. Hãy tạo mới!</td></tr>
                            ) : (
                                books.map(book => (
                                    <tr key={book.MaSach}>
                                        <td>
                                            <img 
                                                src={book.AnhMinhHoa} 
                                                alt="" 
                                                className="book-thumb" 
                                                onError={e => e.target.src='https://via.placeholder.com/50x70?text=No+Img'} 
                                            />
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
                                        <td>
                                            <span className={`stock-badge ${book.SoLuongTon > 0 ? 'instock' : 'outofstock'}`}>
                                                {book.SoLuongTon} {book.DonViTinh}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn-icon btn-edit" onClick={() => handleOpenModal(book)} title="Sửa thông tin">
                                                    ✏️
                                                </button>
                                                <button className="btn-icon btn-delete" onClick={() => handleDelete(book.MaSach)} title="Xóa sách">
                                                    🗑️
                                                </button>
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
                                <h3>{isEditing ? `✏️ Cập nhật: ${formData.maSach}` : "➕ Tạo Đầu Sách Mới"}</h3>
                                <button className="btn-close-modal" onClick={() => setShowModal(false)}>&times;</button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="modal-body">
                                <div className="form-grid-layout">
                                    {/* Cột 1 */}
                                    <div className="form-col">
                                        <div className="form-group">
                                            <label>Tên Sách <span className="req">*</span></label>
                                            <input required name="tenSach" value={formData.tenSach} onChange={handleChange} placeholder="Nhập tên sách..." />
                                        </div>

                                        <div className="form-group-row">
                                            <div className="form-group">
                                                <label>Tác Giả <span className="req">*</span></label>
                                                <select required name="maTG" value={formData.maTG} onChange={handleChange}>
                                                    <option value="">-- Chọn Tác Giả --</option>
                                                    {metadata.authors.map(a => <option key={a.MaTG} value={a.MaTG}>{a.TenTG}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Danh Mục <span className="req">*</span></label>
                                                <select required name="maDM" value={formData.maDM} onChange={handleChange}>
                                                    <option value="">-- Chọn Danh Mục --</option>
                                                    {metadata.categories.map(c => <option key={c.MaDM} value={c.MaDM}>{c.TenDM}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-group-row">
                                            <div className="form-group">
                                                <label>Giá Bán</label>
                                                <input type="number" name="giaBan" value={formData.giaBan} onChange={handleChange} min="0"/>
                                            </div>
                                            <div className="form-group">
                                                <label>Đơn Vị Tính</label>
                                                <input name="donViTinh" value={formData.donViTinh} onChange={handleChange} placeholder="Cuốn" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cột 2 */}
                                    <div className="form-col">
                                        <div className="form-group-row">
                                            <div className="form-group disabled-group">
                                                <label>Số Lượng Tồn (Auto)</label>
                                                <input 
                                                    type="number" 
                                                    name="soLuongTon" 
                                                    value={formData.soLuongTon} 
                                                    readOnly 
                                                    className="read-only-input"
                                                    title="Vui lòng nhập kho ở trang Quản lý Bản sao"
                                                />
                                                <small className="helper-text">👉 Nhập kho tại menu <b>"Quản lý Bản sao"</b></small>
                                            </div>
                                            <div className="form-group">
                                                <label>Năm Xuất Bản</label>
                                                <input type="number" name="namXuatBan" value={formData.namXuatBan} onChange={handleChange} />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Link Ảnh Minh Họa</label>
                                            <input name="anhMinhHoa" value={formData.anhMinhHoa} onChange={handleChange} placeholder="https://..." />
                                            {formData.anhMinhHoa && (
                                                <div className="img-preview">
                                                    <img src={formData.anhMinhHoa} alt="Preview" onError={e=>e.target.style.display='none'}/>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {isEditing && (
                                            <div className="form-group">
                                                <label>Trạng Thái (Cập nhật tự động)</label>
                                                <input value={formData.tinhTrang} readOnly className="read-only-input" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group full-width">
                                    <label>Mô Tả Chi Tiết</label>
                                    <textarea name="moTa" value={formData.moTa} onChange={handleChange} rows="3" placeholder="Nội dung tóm tắt..."></textarea>
                                </div>

                                <div className="form-footer">
                                    <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy bỏ</button>
                                    <button type="submit" className="btn-save">{isEditing ? "Lưu Thay Đổi" : "Tạo Sách Mới"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}