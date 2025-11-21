// src/pages/page_user/Books.js
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { searchBooks } from "../../services/publicService";
import { addToLoanCart, addToPurchaseCart } from "../../services/cartService";
import debounce from "lodash.debounce";
import "./Books.css";

export default function Books() {
  const navigate = useNavigate();

  // --- TRẠNG THÁI CHÍNH ---
  const [books, setBooks] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [addingToCart, setAddingToCart] = useState({}); 

  // --- FETCH SÁCH ---
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
    } catch (err) {
      console.error("❌ Lỗi khi tải sách:", err);
      setApiError(true);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- FETCH KHI LOAD TRANG ---
  useEffect(() => {
    fetchBooks("");
  }, [fetchBooks]);

  // --- DEBOUNCE TÌM KIẾM ---
  const debouncedSearch = useCallback(
    debounce((keyword) => {
      setSearchKeyword(keyword);
      fetchBooks(keyword);
    }, 500),
    [fetchBooks]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.trim().length === 0) {
      setSearchKeyword("");
      fetchBooks("");
    } else {
      debouncedSearch(value);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      debouncedSearch.flush();
    }
  };

  const handleViewDetail = (book) => {
    navigate(`/books/${book.MaSach}`, { 
        state: { 
            bookDetail: book 
        } 
    });
  };

  // ========================================================================
  // 🛒 XỬ LÝ MUA SÁCH (PURCHASE)
  // ========================================================================
  const handleAddToCartPurchase = async (book) => {
    // Mua sách thì vẫn dựa vào SoLuongTon (hoặc logic riêng của bạn)
    if (!book.GiaBan || book.SoLuongTon < 1) return;
    
    setAddingToCart(prev => ({ ...prev, [`purchase-${book.MaSach}`]: true }));
    
    try {
      const payload = {
        MaSach: book.MaSach,
        SoLuong: 1
      };

      const res = await addToPurchaseCart(payload);
      const responseData = res.data || res;

      if (responseData.code === 200) {
        alert(`✅ ${responseData.message || `Đã thêm "${book.TenSach}" vào Giỏ MUA!`}`);
      } else {
        alert(`⚠️ Thông báo: ${responseData.message}`);
      }

    } catch (error) {
      console.error("❌ Lỗi thêm vào giỏ mua:", error);
      const msg = error.response?.data?.message || error.message || "Lỗi kết nối Server";
      alert(`❌ Không thể thêm vào giỏ mua:\n${msg}`);
    } finally {
      setAddingToCart(prev => ({ ...prev, [`purchase-${book.MaSach}`]: false }));
    }
  };

  // ========================================================================
  // 📚 XỬ LÝ MƯỢN SÁCH (LOAN) - ✅ ĐÃ SỬA LOGIC
  // ========================================================================
  const handleAddToCartBorrow = async (book) => {
    // 🔥 SỬA: Kiểm tra SoLuongCoSan (Sẵn sàng) thay vì SoLuongTon
    if (book.SoLuongCoSan < 1) {
        alert("Sách này hiện đã được mượn hết, vui lòng chờ bản sao được trả lại.");
        return;
    }
    
    setAddingToCart(prev => ({ ...prev, [`borrow-${book.MaSach}`]: true }));
    
    try {
      const payload = {
        MaSach: book.MaSach,
        SoLuong: 1
      };

      const res = await addToLoanCart(payload);
      const responseData = res.data || res;

      if (responseData.code === 200) {
        alert(`✅ ${responseData.message || `Đã thêm "${book.TenSach}" vào Giỏ MƯỢN!`}`);
      } else {
        alert(`⚠️ Không thể mượn:\n${responseData.message}`);
      }

    } catch (error) {
      console.error("❌ Lỗi thêm vào giỏ mượn:", error);
      const msg = error.response?.data?.message || error.message || "Lỗi kết nối Server";
      const detail = error.response?.data?.detail || "";
      alert(`❌ Lỗi Mượn Sách:\n${msg}\n${detail}`);
    } finally {
      setAddingToCart(prev => ({ ...prev, [`borrow-${book.MaSach}`]: false }));
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);

  const isAddingToCart = (type, maSach) => addingToCart[`${type}-${maSach}`];

  // --- RENDER ---
  if (loading) {
    return (
      <Layout>
        <div className="books-loading">
          <div className="books-spinner"></div>
          <p>Đang tải danh sách sách...</p>
        </div>
      </Layout>
    );
  }

  const displayBooks = books.length > 0;
  const isSearching = searchKeyword.length > 0;

  return (
    <Layout>
      <div className="books-container">
        <h2 className="books-title">
          {isSearching ? `🔍 Kết quả tìm kiếm cho "${searchKeyword}"` : "📚 Danh sách sách"}
          {displayBooks && <span className="books-count"> ({books.length} cuốn)</span>}
        </h2>

        {/* ... (Phần Search Input giữ nguyên) ... */}
        <div className="books-search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="🔍 Tìm kiếm sách, tác giả, danh mục..."
              value={inputValue}
              onChange={handleSearchChange}
              onKeyPress={handleSearchSubmit}
              className="books-search-input"
            />
            <button onClick={handleSearchSubmit} className="search-button">Tìm kiếm</button>
          </div>
          {isSearching && (
            <button 
              onClick={() => {
                setInputValue("");
                setSearchKeyword("");
                fetchBooks("");
              }}
              className="clear-search-button"
            >
              ✕ Hiển thị tất cả
            </button>
          )}
        </div>

        {/* ... (Phần Link Action Links giữ nguyên) ... */}
        <div className="books-action-links">
          <Link to="/borrow-cart" className="books-link books-link-borrow">🛒 Xem Giỏ MƯỢN</Link>
          <Link to="/checkout" className="books-link books-link-purchase">💰 Xem Giỏ MUA</Link>
        </div>

        {/* --- DANH SÁCH SÁCH --- */}
        {!displayBooks && !loading && !apiError && (
          <div className="books-no-results">
             <div className="no-results-icon">📭</div>
             <p>{isSearching ? `Không tìm thấy sách phù hợp với "${searchKeyword}"` : "Hiện chưa có sách nào trong hệ thống"}</p>
          </div>
        )}

        {displayBooks && (
          <div className="books-grid">
            {books.map((book) => (
              <div key={book.MaSach} className="books-card">
                <div className="books-card-image-container">
                  <img 
                    src={book.AnhMinhHoa} 
                    alt={book.TenSach} 
                    className="books-card-image" 
                    onError={(e) => { e.target.src = "https://via.placeholder.com/150x200.png?text=No+Image"; }}
                    onClick={() => handleViewDetail(book)}
                  />
                </div>
                
                <div className="books-card-content">
                  <h4 className="books-card-title" onClick={() => handleViewDetail(book)}>
                    {book.TenSach}
                  </h4>
                  
                  <div className="books-card-info">
                    <p className="books-card-text"><span className="info-icon">✍️</span> {book.TenTG || book.MaTG}</p>
                    <p className="books-card-text"><span className="info-icon">📂</span> {book.TenDM || book.MaDM}</p>
                    <p className="books-card-text"><span className="info-icon">🗓</span> {book.NamXuatBan}</p>
                    {book.GiaBan && (
                      <p className="books-card-price"><span className="info-icon">💰</span> {formatCurrency(book.GiaBan)}</p>
                    )}
                  </div>

                  {/* 🔥 SỬA PHẦN HIỂN THỊ TỒN KHO: Hiển thị cả Sẵn có / Tổng */}
                  <div className="books-card-status-section">
                    <span className={`books-card-status ${
                      book.SoLuongCoSan > 0 ? "status-available" : "status-unavailable"
                    }`}>
                      {book.SoLuongCoSan > 0 ? "✅ Có thể mượn" : "❌ Tạm hết bản sao"}
                    </span>
                    <span className="books-card-stock" style={{fontSize: '0.85rem'}}>
                      Sẵn có: <b>{book.SoLuongCoSan}</b> / {book.SoLuongTon}
                    </span>
                  </div>

                  <div className="books-card-actions">
                    <button 
                      onClick={() => handleViewDetail(book)} 
                      className="books-action-btn books-btn-detail"
                    >
                      Xem chi tiết
                    </button>
                    
                    {/* 🔥 SỬA ĐIỀU KIỆN NÚT MƯỢN: Dựa vào SoLuongCoSan */}
                    {book.TinhTrang === "Còn" && (
                      <div className="books-cart-buttons">
                        <button 
                          onClick={() => handleAddToCartBorrow(book)}
                          // Disable nút nếu không có sách sẵn sàng (SoLuongCoSan === 0)
                          disabled={isAddingToCart('borrow', book.MaSach) || book.SoLuongCoSan < 1}
                          className={`books-action-btn books-btn-borrow ${
                            isAddingToCart('borrow', book.MaSach) ? "btn-loading" : ""
                          } ${book.SoLuongCoSan < 1 ? "btn-disabled" : ""}`}
                          title={book.SoLuongCoSan < 1 ? "Đã hết sách để mượn" : "Thêm vào giỏ mượn"}
                        >
                          {isAddingToCart('borrow', book.MaSach) ? "⏳" : "📚"} 
                          {isAddingToCart('borrow', book.MaSach) ? " Đang thêm..." : " Mượn"}
                        </button>
                        
                        {book.GiaBan && (
                          <button 
                            onClick={() => handleAddToCartPurchase(book)} 
                            disabled={isAddingToCart('purchase', book.MaSach)}
                            className={`books-action-btn books-btn-purchase ${
                              isAddingToCart('purchase', book.MaSach) ? "btn-loading" : ""
                            }`}
                          >
                            {isAddingToCart('purchase', book.MaSach) ? "⏳" : "🛒"}
                            {isAddingToCart('purchase', book.MaSach) ? " Đang thêm..." : " Mua"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}