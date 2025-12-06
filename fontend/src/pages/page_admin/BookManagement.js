// src/pages/page_admin/BookManagement.js
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { 
    getBooksAdmin, 
    getBookMetadata, 
    createBook, 
    updateBook, 
    deleteBook,
    createAuthorQuick,
    createCategoryQuick
} from "../../services/bookManagementService";
import "./BookManagement.css";

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

export default function BookManagement() {
    // --- STATE DỮ LIỆU ---
    const [books, setBooks] = useState([]);
    const [metadata, setMetadata] = useState({ authors: [], categories: [] });
    const [loading, setLoading] = useState(true);
    
    // --- STATE UI (Search, Filter, Pagination) ---
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState(""); // Lọc theo Mã DM
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7; // Số sách hiển thị trên 1 trang

    // --- STATE FORM & MODAL ---
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const initialForm = {
        maSach: "", tenSach: "", maTG: "", maDM: "",
        giaBan: 0, soLuongTon: 0, namXuatBan: new Date().getFullYear(),
        moTa: "", donViTinh: "Cuốn", tinhTrang: "Hết", anhMinhHoa: "" 
    };
    const [formData, setFormData] = useState(initialForm);

    // --- LOAD DATA ---
    useEffect(() => { fetchData(); }, []);

    // Reset về trang 1 khi tìm kiếm hoặc lọc thay đổi
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCategory]);

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

    const refreshMetadata = async () => {
        try {
            const metaRes = await getBookMetadata();
            setMetadata(metaRes.data?.data || { authors: [], categories: [] });
        } catch (error) { console.error(error); }
    };

    // --- LOGIC LỌC & PHÂN TRANG (CORE) ---
    
    // 1. Lọc dữ liệu
    const filteredBooks = books.filter(book => {
        // Tìm theo tên hoặc mã (không phân biệt hoa thường)
        const matchesSearch = 
            book.TenSach.toLowerCase().includes(searchTerm.toLowerCase()) || 
            book.MaSach.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Lọc theo danh mục (nếu có chọn)
        const matchesCategory = filterCategory ? book.MaDM === filterCategory : true;

        return matchesSearch && matchesCategory;
    });

    // 2. Tính toán phân trang
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentBooks = filteredBooks.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // --- HANDLERS CŨ (Giữ nguyên) ---
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
    const handleAddQuick = async (type) => {
        const label = type === 'author' ? "Tác giả" : "Danh mục";
        const name = window.prompt(`Nhập tên ${label} mới:`);
        if (name && name.trim()) {
            try {
                let res;
                if (type === 'author') {
                    res = await createAuthorQuick({ tenTG: name });
                    if(res.data?.data?.maTG) setFormData(prev => ({ ...prev, maTG: res.data.data.maTG }));
                } else {
                    res = await createCategoryQuick({ tenDM: name });
                    if(res.data?.data?.maDM) setFormData(prev => ({ ...prev, maDM: res.data.data.maDM }));
                }
                alert(`✅ Đã thêm ${label}: ${name}`);
                await refreshMetadata();
            } catch (error) {
                alert(`❌ Lỗi thêm ${label}: ` + (error.response?.data?.message || error.message));
            }
        }
    };
   const handleOpenModal = (book = null) => {
    if (book) {
        // CHẾ ĐỘ SỬA: Map dữ liệu từ 'book' vào 'formData'
        setIsEditing(true);
        setFormData({
            maSach: book.MaSach,      // Map đúng key từ API (thường là PascalCase) sang state (camelCase)
            tenSach: book.TenSach,
            maTG: book.MaTG,
            maDM: book.MaDM,
            giaBan: book.GiaBan,
            soLuongTon: book.SoLuongTon,
            namXuatBan: book.NamXuatBan,
            moTa: book.MoTa || "",
            donViTinh: book.DonViTinh || "Cuốn",
            tinhTrang: book.TinhTrang || "Còn",
            anhMinhHoa: book.AnhMinhHoa // Lưu URL ảnh cũ để gửi lên nếu không chọn ảnh mới
        });
        setPreviewUrl(book.AnhMinhHoa); // Hiển thị ảnh hiện tại
        setSelectedFile(null);          // Reset file mới chọn
    } else {
        // CHẾ ĐỘ THÊM MỚI: Reset về form rỗng
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
        // (Logic append FormData giữ nguyên như cũ)
        Object.keys(formData).forEach(key => {
            if (key !== 'anhMinhHoa') dataPayload.append(key, formData[key]);
        });
        if (isEditing && !selectedFile) dataPayload.append("anhMinhHoa", formData.anhMinhHoa);
        if (selectedFile) dataPayload.append("AnhMinhHoa", selectedFile);

        try {
            if (isEditing) {
                await updateBook(formData.maSach, dataPayload);
                alert("✅ Cập nhật thành công!");
            } else {
                await createBook(dataPayload);
                alert("✅ Thêm mới thành công!");
            }
            setShowModal(false);
            fetchData(); 
        } catch (error) {
            alert("❌ Lỗi: " + (error.response?.data?.message || error.message));
        }
    };
    const handleDelete = async (id) => {
        if (window.confirm("⚠️ Bạn có chắc chắn muốn xóa?")) {
            try { await deleteBook(id); alert("✅ Đã xóa."); fetchData(); } 
            catch (error) { alert("❌ Lỗi xóa."); }
        }
    };

    // --- RENDER ---
    return (
        <Layout>
            <div className="book-mgmt-container">
                <div className="mgmt-header">
                    <div>
                        <h2 className="page-title">📚 Quản Lý Đầu Sách</h2>
                        <p className="sub-title">Tổng số: <b>{books.length}</b> đầu sách</p>
                    </div>
                    <button className="btn-add-new" onClick={() => handleOpenModal()}>+ Tạo Sách Mới</button>
                </div>

                {/* 👇 KHU VỰC TOOLBAR: SEARCH & FILTER */}
                <div className="table-toolbar">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input 
                            placeholder="Tìm tên sách, mã sách..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="filter-box">
                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                            <option value="">-- Tất cả danh mục --</option>
                            {metadata.categories.map(c => (
                                <option key={c.MaDM} value={c.MaDM}>{c.TenDM}</option>
                            ))}
                        </select>
                    </div>
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
                            ) : currentBooks.length === 0 ? (
                                <tr><td colSpan="6" className="text-center">Không tìm thấy sách nào.</td></tr>
                            ) : (
                                // 👇 Render currentBooks thay vì books
                                currentBooks.map(book => (
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

                {/* 👇 KHU VỰC PHÂN TRANG */}
                {filteredBooks.length > 0 && (
                    <div className="pagination">
                        <button 
                            disabled={currentPage === 1} 
                            onClick={() => paginate(currentPage - 1)}
                            className="page-btn"
                        >
                            &laquo; Trước
                        </button>
                        
                        <span className="page-info">
                            Trang <b>{currentPage}</b> / {totalPages}
                        </span>

                        <button 
                            disabled={currentPage === totalPages} 
                            onClick={() => paginate(currentPage + 1)}
                            className="page-btn"
                        >
                            Sau &raquo;
                        </button>
                    </div>
                )}

                {/* MODAL GIỮ NGUYÊN NHƯ CŨ */}
                {showModal && (
                   // ... (Code Modal cũ của bạn giữ nguyên ở đây)
                   // Để tiết kiệm dòng code tôi không paste lại đoạn Modal, bạn giữ y nguyên nhé.
                   // Chỉ cần lưu ý phần handleSubmit tôi đã rút gọn logic append object một chút cho gọn.
                   <div className="modal-overlay">
                       {/* ... Paste lại nội dung modal cũ ... */}
                       {/* Form copy từ code bài trước */}
                       <div className="modal-content large-modal">
                            <div className="modal-header">
                                <h3>{isEditing ? "✏️ Cập nhật Sách" : "➕ Tạo Sách Mới"}</h3>
                                <button className="btn-close-modal" onClick={() => setShowModal(false)}>&times;</button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="modal-body">
                                <div className="form-grid-layout">
                                    <div className="form-col">
                                        <div className="form-group">
                                            <label>Tên Sách <span className="req">*</span></label>
                                            <input required name="tenSach" value={formData.tenSach} onChange={handleChange} />
                                        </div>
                                        
                                        <div className="form-group-row">
                                            <div className="form-group">
                                                <label>Tác Giả <span className="req">*</span></label>
                                                <div style={{display: 'flex', gap: '5px'}}>
                                                    <select required name="maTG" value={formData.maTG} onChange={handleChange} style={{flex: 1}}>
                                                        <option value="">-- Chọn --</option>
                                                        {metadata.authors.map(a => <option key={a.MaTG} value={a.MaTG}>{a.TenTG}</option>)}
                                                    </select>
                                                    <button type="button" className="btn-quick-add" onClick={() => handleAddQuick('author')}>➕</button>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Danh Mục <span className="req">*</span></label>
                                                <div style={{display: 'flex', gap: '5px'}}>
                                                    <select required name="maDM" value={formData.maDM} onChange={handleChange} style={{flex: 1}}>
                                                        <option value="">-- Chọn --</option>
                                                        {metadata.categories.map(c => <option key={c.MaDM} value={c.MaDM}>{c.TenDM}</option>)}
                                                    </select>
                                                    <button type="button" className="btn-quick-add" onClick={() => handleAddQuick('category')}>➕</button>
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