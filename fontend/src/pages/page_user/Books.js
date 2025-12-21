// src/pages/page_user/Books.js
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { searchBooks } from "../../services/publicService";
import { addToLoanCart, addToPurchaseCart } from "../../services/cartService";
import debounce from "lodash.debounce";
import "./Books.css";

const ITEMS_PER_PAGE = 12; 

export default function Books() {
  const navigate = useNavigate();

  // --- TRẠNG THÁI ---
  const [books, setBooks] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [addingToCart, setAddingToCart] = useState({}); 

  // --- FETCH API ---
  const fetchBooks = useCallback(async (keyword = "") => {
    setLoading(true);
    setApiError(false);
    try {
      let response = await searchBooks({ search: keyword });
      let booksData = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          booksData = response.data.filter((item) => item && item.MaSach);
        } else if (response.data.data && Array.isArray(response.data.data)) {
          booksData = response.data.data.filter((item) => item && item.MaSach);
        }
      }
      setBooks(booksData);
      setCurrentPage(1); 
    } catch (err) {
      console.error("❌ Lỗi tải sách:", err);
      setApiError(true);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks("");
  }, [fetchBooks]);

  // --- SEARCH LOGIC (DEBOUNCE) ---
  const debouncedSearch = useCallback(
    debounce((keyword) => {
      setSearchKeyword(keyword);
      fetchBooks(keyword);
    }, 500),
    [fetchBooks]
  );

  // Clear debounce khi component unmount
  useEffect(() => { return () => debouncedSearch.cancel(); }, [debouncedSearch]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (value.trim().length === 0) {
      debouncedSearch.cancel(); // Hủy tìm kiếm cũ nếu xóa hết tay
      setSearchKeyword("");
      fetchBooks("");
    } else {
      debouncedSearch(value);
    }
  };

  const handleSearchSubmit = () => debouncedSearch.flush();

  // ⭐️ HÀM XÓA LỌC (ĐÃ SỬA)
  const handleClearSearch = () => {
    debouncedSearch.cancel(); // 🛑 QUAN TRỌNG: Hủy ngay lệnh tìm kiếm đang chờ
    setInputValue("");        // Xóa ô nhập
    setSearchKeyword("");     // Xóa từ khóa trong state
    fetchBooks("");           // Gọi API lấy lại toàn bộ sách
  };

  const handleViewDetail = (book) => {
    navigate(`/books/${book.MaSach}`, { state: { bookDetail: book } });
  };

  // --- CART HANDLERS ---
  const handleAddToCartBorrow = async (book) => {
    if (book.SoLuongCoSan < 1) return alert("Sách này tạm hết bản sao để mượn.");
    setAddingToCart(prev => ({ ...prev, [`borrow-${book.MaSach}`]: true }));
    try {
        const res = await addToLoanCart({ MaSach: book.MaSach, SoLuong: 1 });
        const data = res.data || res;
        alert(data.code === 200 ? `✅ Đã thêm "${book.TenSach}" vào giỏ mượn!` : data.message);
    } catch (e) { alert("Lỗi thêm giỏ mượn: " + (e.response?.data?.message || e.message)); }
    finally { setAddingToCart(prev => ({ ...prev, [`borrow-${book.MaSach}`]: false })); }
  };

  const handleAddToCartPurchase = async (book) => {
    if (!book.GiaBan || book.SoLuongTon < 1) return;
    setAddingToCart(prev => ({ ...prev, [`purchase-${book.MaSach}`]: true }));
    try {
        const res = await addToPurchaseCart({ MaSach: book.MaSach, SoLuong: 1 });
        const data = res.data || res;
        alert(data.code === 200 ? `✅ Đã thêm "${book.TenSach}" vào giỏ mua!` : data.message);
    } catch (e) { alert("Lỗi thêm giỏ mua: " + (e.response?.data?.message || e.message)); }
    finally { setAddingToCart(prev => ({ ...prev, [`purchase-${book.MaSach}`]: false })); }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  const isAddingToCart = (type, maSach) => addingToCart[`${type}-${maSach}`];

  // --- PHÂN TRANG ---
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentBooks = books.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(books.length / ITEMS_PER_PAGE);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSearching = searchKeyword.length > 0;
  const displayBooks = books.length > 0;

  // --- RENDER ---
  return (
    <Layout>
      <div className="books-container">
        <h2 className="books-title">
          {isSearching ? `🔍 Kết quả: "${searchKeyword}"` : "📚 Danh sách sách"}
          {displayBooks && !loading && <span className="books-count"> ({books.length})</span>}
        </h2>

        {/* INPUT TÌM KIẾM */}
        <div className="books-search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="🔍 Nhập tên sách, tác giả..."
              value={inputValue}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className="books-search-input"
              autoFocus
            />
            <button onClick={handleSearchSubmit} className="search-button">
              {loading ? "..." : "Tìm"}
            </button>
          </div>
          {/* Nút Xóa Lọc */}
          {isSearching && (
            <button className="clear-search-button" onClick={handleClearSearch}>
              ✕ Xóa lọc
            </button>
          )}
        </div>

        <div className="books-action-links">
          <Link to="/borrow-cart" className="books-link books-link-borrow">🛒 Giỏ Mượn</Link>
          <Link to="/checkout" className="books-link books-link-purchase">💰 Giỏ Mua</Link>
        </div>

        {/* LOADING & ERROR */}
        {loading && (
            <div className="books-loading" style={{padding: '40px', textAlign: 'center'}}>
                <div className="books-spinner"></div>
                <p style={{color: '#64748b', marginTop: '10px'}}>Đang tải dữ liệu...</p>
            </div>
        )}

        {!loading && !apiError && !displayBooks && (
          <div className="books-no-results">
             <div className="no-results-icon">📭</div>
             <p>{isSearching ? "Không tìm thấy sách nào." : "Chưa có sách trong hệ thống."}</p>
          </div>
        )}

        {/* GRID SÁCH */}
        {!loading && displayBooks && (
          <>
            <div className="books-grid">
              {currentBooks.map((book) => (
                <div key={book.MaSach} className="books-card">
                  <div className="books-card-image-container">

  {/* BADGE TRẠNG THÁI */}
  <span className={`book-badge ${book.SoLuongCoSan > 0 ? "available" : "out"}`}>
    {book.SoLuongCoSan > 0 ? "Còn sách" : "Hết"}
  </span>

  <img 
    src={book.AnhMinhHoa}
    alt={book.TenSach}
    className="books-card-image" 
    onError={(e) => e.target.src = "https://via.placeholder.com/150?text=No+Img"}
    onClick={() => handleViewDetail(book)}
  />

</div>
                  
                  <div className="books-card-content">
                    <h4 className="books-card-title" onClick={() => handleViewDetail(book)}>{book.TenSach}</h4>
                    
                    <div className="books-card-info">
                      <p className="books-card-text"><span>✍️</span> {book.TenTG}</p>
                      <p className="books-card-text"><span>📂</span> {book.TenDM}</p>
                      {book.GiaBan && <p className="books-card-price"><span>💰</span> {formatCurrency(book.GiaBan)}</p>}
                    </div>

                    <div className="books-card-status-section">
                      <span className={`books-card-status ${book.SoLuongCoSan > 0 ? "status-available" : "status-unavailable"}`}>
                        {book.SoLuongCoSan > 0 ? "✅ Có sẵn" : "❌ Tạm hết"}
                      </span>
                      <span className="books-card-stock">Kho: <b>{book.SoLuongCoSan}</b>/{book.SoLuongTon}</span>
                    </div>

                    <div className="books-card-actions">
                      <button onClick={() => handleViewDetail(book)} className="books-action-btn books-btn-detail">Chi tiết</button>
                      {book.TinhTrang === "Còn" && (
                        <div className="books-cart-buttons">
                          <button 
                            onClick={() => handleAddToCartBorrow(book)}
                            disabled={isAddingToCart('borrow', book.MaSach) || book.SoLuongCoSan < 1}
                            className={`books-action-btn books-btn-borrow ${book.SoLuongCoSan < 1 ? "btn-disabled" : ""}`}
                          >
                            {isAddingToCart('borrow', book.MaSach) ? "..." : "Mượn"}
                          </button>
                          {book.GiaBan && (
                            <button 
                              onClick={() => handleAddToCartPurchase(book)} 
                              disabled={isAddingToCart('purchase', book.MaSach)}
                              className="books-action-btn books-btn-purchase"
                            >
                              {isAddingToCart('purchase', book.MaSach) ? "..." : "Mua"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* THANH PHÂN TRANG */}
            {totalPages > 1 && (
              <div className="pagination-container" style={{display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '30px'}}>
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => paginate(currentPage - 1)}
                  className="page-btn"
                  style={{padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', background: currentPage===1?'#f1f1f1':'#fff'}}
                >
                  &laquo; Trước
                </button>
                <span style={{lineHeight: '35px', fontWeight: 'bold'}}>Trang {currentPage} / {totalPages}</span>
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => paginate(currentPage + 1)}
                  className="page-btn"
                  style={{padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', background: currentPage===totalPages?'#f1f1f1':'#fff'}}
                >
                  Sau &raquo;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}