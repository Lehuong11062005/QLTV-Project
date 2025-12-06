import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getBooksAdmin } from "../../services/bookManagementService";
import { getCopiesByBook, generateCopies, updateCopyStatus, deleteCopy } from "../../services/bookStatusService";
import "./BookStatusManagement.css";

// Hằng số giới hạn số lượng item trên 1 trang
const ITEMS_PER_PAGE = 10;

export default function BookStatusManagement() {
    const [books, setBooks] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [copies, setCopies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingCopies, setLoadingCopies] = useState(false);

    // State tìm kiếm
    const [searchTerm, setSearchTerm] = useState("");
    const [searchCopyTerm, setSearchCopyTerm] = useState("");

    // ⭐️ MỚI: State Phân trang
    const [currentPageBook, setCurrentPageBook] = useState(1);
    const [currentPageCopy, setCurrentPageCopy] = useState(1);

    // State nhập kho
    const [importQty, setImportQty] = useState(1);
    const [importLocation, setImportLocation] = useState("Kệ A1");

    // Load danh sách đầu sách
    useEffect(() => {
        fetchBooks();
    }, []);

    // Reset trang về 1 khi tìm kiếm thay đổi
    useEffect(() => {
        setCurrentPageBook(1);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPageCopy(1);
    }, [searchCopyTerm]);

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
        setSearchCopyTerm(""); 
        setCurrentPageCopy(1); // Reset trang bản sao về 1
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
            handleSelectBook(selectedBook);
            fetchBooks();
        } catch (err) {
            alert("❌ Lỗi: " + (err.response?.data?.message || err.message));
        }
    };

    const handleStatusChange = async (maBanSao, newStatus) => {
        try {
            await updateCopyStatus(maBanSao, { trangThai: newStatus });
            setCopies(prev => prev.map(c => c.MaBanSao === maBanSao ? { ...c, TrangThaiBanSao: newStatus } : c));
        } catch (err) {
            alert("Lỗi cập nhật trạng thái");
        }
    };

    const handleDeleteCopy = async (maBanSao) => {
        if (!window.confirm("Bạn chắc chắn muốn xóa bản sao này?")) return;
        try {
            await deleteCopy(maBanSao);
            setCopies(prev => prev.filter(c => c.MaBanSao !== maBanSao));
            fetchBooks(); 
        } catch (err) {
            alert("❌ Không thể xóa (Có thể sách đã từng được mượn).");
        }
    };

    // --- LOGIC PHÂN TRANG CHO SÁCH (Cột Trái) ---
    const filteredBooks = books.filter(book => {
        const term = searchTerm.toLowerCase();
        return book.TenSach.toLowerCase().includes(term) || book.MaSach.toLowerCase().includes(term);
    });

    const indexOfLastBook = currentPageBook * ITEMS_PER_PAGE;
    const indexOfFirstBook = indexOfLastBook - ITEMS_PER_PAGE;
    const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook);
    const totalPagesBook = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);

    // --- LOGIC PHÂN TRANG CHO BẢN SAO (Cột Phải) ---
    const filteredCopies = copies.filter(copy => 
        copy.MaBanSao.toLowerCase().includes(searchCopyTerm.toLowerCase())
    );

    const indexOfLastCopy = currentPageCopy * ITEMS_PER_PAGE;
    const indexOfFirstCopy = indexOfLastCopy - ITEMS_PER_PAGE;
    const currentCopies = filteredCopies.slice(indexOfFirstCopy, indexOfLastCopy);
    const totalPagesCopy = Math.ceil(filteredCopies.length / ITEMS_PER_PAGE);

    return (
        <Layout>
            <div className="status-mgmt-container">
                <h2 className="page-title">📦 Quản Lý Bản Sao & Tồn Kho</h2>
                
                <div className="mgmt-layout">
                    {/* --- CỘT TRÁI: DANH SÁCH SÁCH --- */}
                    <div className="left-panel">
                        <div className="panel-header">Danh sách đầu sách</div>
                        
                        <div style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                            <input 
                                type="text"
                                placeholder="🔍 Tìm tên sách hoặc mã..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none'
                                }}
                            />
                        </div>

                        <div className="book-list-scroll">
                            {loading ? <p style={{padding: '10px'}}>Đang tải...</p> : (
                                currentBooks.length === 0 ? (
                                    <p style={{padding: '10px', color: '#888', textAlign: 'center'}}>
                                        Không tìm thấy sách.
                                    </p>
                                ) : (
                                    currentBooks.map(book => (
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
                                    ))
                                )
                            )}
                        </div>

                        {/* ⭐️ PHÂN TRANG CHO SÁCH */}
                        {totalPagesBook > 1 && (
                            <div className="pagination-controls">
                                <button 
                                    disabled={currentPageBook === 1} 
                                    onClick={() => setCurrentPageBook(prev => prev - 1)}
                                >
                                    &lt;
                                </button>
                                <span>Trang {currentPageBook} / {totalPagesBook}</span>
                                <button 
                                    disabled={currentPageBook === totalPagesBook} 
                                    onClick={() => setCurrentPageBook(prev => prev + 1)}
                                >
                                    &gt;
                                </button>
                            </div>
                        )}
                    </div>

                    {/* --- CỘT PHẢI: CHI TIẾT BẢN SAO --- */}
                    <div className="right-panel">
                        {!selectedBook ? (
                            <div className="empty-state">👈 Vui lòng chọn một cuốn sách để quản lý bản sao</div>
                        ) : (
                            <>
                                <div className="panel-header-actions">
                                    <div style={{flex: 1, marginRight: '20px'}}>
                                        <h3 style={{marginBottom: '8px'}}>{selectedBook.TenSach}</h3>
                                        <input 
                                            type="text"
                                            placeholder="🔍 Tìm mã bản sao..."
                                            value={searchCopyTerm}
                                            onChange={(e) => setSearchCopyTerm(e.target.value)}
                                            style={{
                                                padding: '6px 10px', border: '1px solid #94a3b8', borderRadius: '4px', width: '100%', maxWidth: '250px', fontSize: '0.9rem'
                                            }}
                                        />
                                    </div>

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
                                        <>
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
                                                    {currentCopies.length === 0 ? (
                                                        <tr><td colSpan="4" className="text-center" style={{padding: '20px', color: '#888'}}>
                                                            {copies.length === 0 
                                                                ? "Chưa có bản sao nào. Hãy nhập kho." 
                                                                : "Không tìm thấy kết quả."}
                                                        </td></tr>
                                                    ) : currentCopies.map(copy => (
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
                                        </>
                                    )}
                                </div>

                                {/* ⭐️ PHÂN TRANG CHO BẢN SAO */}
                                {totalPagesCopy > 1 && (
                                    <div className="pagination-controls" style={{marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9'}}>
                                        <button 
                                            disabled={currentPageCopy === 1} 
                                            onClick={() => setCurrentPageCopy(prev => prev - 1)}
                                        >
                                            &lt;
                                        </button>
                                        <span>Trang {currentPageCopy} / {totalPagesCopy}</span>
                                        <button 
                                            disabled={currentPageCopy === totalPagesCopy} 
                                            onClick={() => setCurrentPageCopy(prev => prev + 1)}
                                        >
                                            &gt;
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}