import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getBooksAdmin } from "../../services/bookManagementService";
import { getCopiesByBook, generateCopies, updateCopyStatus, deleteCopy } from "../../services/bookStatusService";
import "./BookStatusManagement.css";

export default function BookStatusManagement() {
    const [books, setBooks] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [copies, setCopies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingCopies, setLoadingCopies] = useState(false);

    // State nhập kho
    const [importQty, setImportQty] = useState(1);
    const [importLocation, setImportLocation] = useState("Kệ A1");

    // Load danh sách đầu sách
    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        setLoading(true);
        try {
            const res = await getBooksAdmin();
            setBooks(res.data?.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Load bản sao khi chọn sách
    const handleSelectBook = async (book) => {
        setSelectedBook(book);
        setLoadingCopies(true);
        try {
            const res = await getCopiesByBook(book.MaSach);
            setCopies(res.data?.data || []);
        } catch (err) {
            alert("Lỗi tải bản sao");
        } finally {
            setLoadingCopies(false);
        }
    };

    // Xử lý nhập thêm bản sao
    const handleImport = async () => {
        if (!selectedBook) return;
        if (importQty < 1) return alert("Số lượng phải > 0");
        
        if (!window.confirm(`Xác nhận nhập thêm ${importQty} cuốn cho sách "${selectedBook.TenSach}"?`)) return;

        try {
            await generateCopies({
                maSach: selectedBook.MaSach,
                soLuongNhap: Number(importQty),
                viTriKe: importLocation
            });
            alert("✅ Nhập kho thành công!");
            handleSelectBook(selectedBook); // Reload lại list
            fetchBooks(); // Reload lại tổng tồn kho bên trái
        } catch (err) {
            alert("❌ Lỗi: " + (err.response?.data?.message || err.message));
        }
    };

    // Cập nhật trạng thái
    const handleStatusChange = async (maBanSao, newStatus) => {
        try {
            await updateCopyStatus(maBanSao, { trangThai: newStatus });
            // Update UI local cho nhanh
            setCopies(prev => prev.map(c => c.MaBanSao === maBanSao ? { ...c, TrangThaiBanSao: newStatus } : c));
        } catch (err) {
            alert("Lỗi cập nhật trạng thái");
        }
    };

    // Xóa bản sao
    const handleDeleteCopy = async (maBanSao) => {
        if (!window.confirm("Bạn chắc chắn muốn xóa bản sao này?")) return;
        try {
            await deleteCopy(maBanSao);
            setCopies(prev => prev.filter(c => c.MaBanSao !== maBanSao));
            fetchBooks(); // Reload tồn kho tổng
        } catch (err) {
            alert("❌ Không thể xóa (Có thể sách đã từng được mượn).");
        }
    };

    return (
        <Layout>
            <div className="status-mgmt-container">
                <h2 className="page-title">📦 Quản Lý Bản Sao & Tồn Kho</h2>
                
                <div className="mgmt-layout">
                    {/* CỘT TRÁI: DANH SÁCH SÁCH */}
                    <div className="left-panel">
                        <div className="panel-header">Danh sách đầu sách</div>
                        <div className="book-list-scroll">
                            {loading ? <p>Đang tải...</p> : books.map(book => (
                                <div 
                                    key={book.MaSach} 
                                    className={`book-item ${selectedBook?.MaSach === book.MaSach ? 'active' : ''}`}
                                    onClick={() => handleSelectBook(book)}
                                >
                                    <div className="book-item-title">{book.TenSach}</div>
                                    <div className="book-item-meta">
                                        <span>#{book.MaSach}</span>
                                        <span className="stock-count">Tồn: {book.SoLuongTon}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CỘT PHẢI: CHI TIẾT BẢN SAO */}
                    <div className="right-panel">
                        {!selectedBook ? (
                            <div className="empty-state">👈 Vui lòng chọn một cuốn sách để quản lý bản sao</div>
                        ) : (
                            <>
                                <div className="panel-header-actions">
                                    <h3>{selectedBook.TenSach}</h3>
                                    <div className="import-box">
                                        <input 
                                            type="number" min="1" className="qty-input"
                                            value={importQty} onChange={e => setImportQty(e.target.value)}
                                        />
                                        <input 
                                            type="text" className="loc-input" placeholder="Vị trí (Kệ A...)"
                                            value={importLocation} onChange={e => setImportLocation(e.target.value)}
                                        />
                                        <button className="btn-import" onClick={handleImport}>+ Nhập Kho</button>
                                    </div>
                                </div>

                                <div className="copies-table-wrapper">
                                    {loadingCopies ? <p>Đang tải bản sao...</p> : (
                                        <table className="copies-table">
                                            <thead>
                                                <tr>
                                                    <th>Mã Bản Sao</th>
                                                    <th>Vị Trí</th>
                                                    <th>Trạng Thái</th>
                                                    <th>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {copies.length === 0 ? (
                                                    <tr><td colSpan="4" className="text-center">Chưa có bản sao nào. Hãy nhập kho.</td></tr>
                                                ) : copies.map(copy => (
                                                    <tr key={copy.MaBanSao}>
                                                        <td><span className="code-tag">{copy.MaBanSao}</span></td>
                                                        <td>{copy.ViTriKe}</td>
                                                        <td>
                                                            <select 
                                                                value={copy.TrangThaiBanSao}
                                                                onChange={(e) => handleStatusChange(copy.MaBanSao, e.target.value)}
                                                                className={`status-select ${copy.TrangThaiBanSao}`}
                                                            >
                                                                <option value="SanSang">Sẵn sàng</option>
                                                                <option value="DangMuon">Đang mượn</option>
                                                                <option value="HuHong">Hư hỏng</option>
                                                                <option value="Mat">Mất</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <button className="btn-icon-del" onClick={() => handleDeleteCopy(copy.MaBanSao)}>🗑️</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}