// src/pages/page_user/BookDetail.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Layout from "../../components/Layout";
import { getBookById } from "../../services/publicService";
import { addToLoanCart, addToPurchaseCart } from "../../services/cartService";
import "./BookDetail.css";

export default function BookDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState(false);
    const [purchaseQuantity, setPurchaseQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        console.log("📍 BookDetail - ID từ URL:", id);
        console.log("📍 BookDetail - State từ navigate:", location.state);

        if (location.state?.bookDetail) {
            console.log("🎯 Sử dụng dữ liệu từ state (nhanh hơn)");
            setBook(location.state.bookDetail);
            setLoading(false);
            return;
        }

        const fetchBookDetail = async () => {
            setLoading(true);
            setApiError(false);
            try {
                console.log("🔄 Gọi API chi tiết sách...");
                const res = await getBookById(id);
                console.log("✅ API Response:", res);
                
                if (res && res.MaSach) {
                    setBook(res);
                } else {
                    console.warn("⚠️ API trả về dữ liệu không hợp lệ");
                    setApiError(true);
                }
            } catch (err) {
                console.error("❌ Lỗi khi tải chi tiết sách:", err);
                console.error("❌ Chi tiết lỗi:", err.response?.data);
                setApiError(true);
            } finally {
                setLoading(false);
            }
        };
        
        fetchBookDetail();
    }, [id, location.state]);

    const handleQuantityChange = (e) => {
        const value = parseInt(e.target.value) || 1;
        if (!book || !book.SoLuongTon) {
            setPurchaseQuantity(Math.max(1, value));
            return;
        }

        let newQty = Math.max(1, value);
        if (newQty > book.SoLuongTon) {
            newQty = book.SoLuongTon;
        }
        setPurchaseQuantity(newQty);
    };

    const handleAddToCartBorrow = async () => {
        if (!book || book.SoLuongTon < 1) return;
        
        console.log("🛒 Bắt đầu thêm vào giỏ mượn...");
        console.log("📖 Thông tin sách:", book);
        
        // Kiểm tra đăng nhập
        const token = localStorage.getItem('token');
        console.log("🔐 Token hiện tại:", token ? 'Có' : 'Không');
        
        if (!token) {
            alert('🔐 Vui lòng đăng nhập để sử dụng chức năng mượn sách');
            navigate('/login', { state: { from: '/books/' + id } });
            return;
        }
        
        setAddingToCart(true);
        
        try {
            const requestData = {
                maSach: book.MaSach,
                soLuong: 1
            };
            console.log("📤 Gửi request đến API...");
            console.log("📦 Dữ liệu gửi:", requestData);
            
            const response = await addToLoanCart(requestData);
            console.log("✅ Response từ server:", response);
            console.log("📊 Response data:", response.data);
            console.log("🔢 Response status:", response.status);

            if (response.code === 200 || response.status === 200) {
                alert(`📚 Đã thêm "${book.TenSach}" vào Giỏ Mượn!`);
                navigate("/borrow-cart");
            } else {
                alert(`❌ Lỗi: ${response.message || 'Không thể thêm vào giỏ mượn'}`);
            }
        } catch (error) {
            console.error("❌ Lỗi thêm vào giỏ mượn:", error);
            console.error("🔧 Error details:", error.message);
            
            if (error.response) {
                console.error("🚨 Server error:", error.response.status, error.response.data);
                alert(`❌ Lỗi server: ${error.response.status} - ${error.response.data?.message || 'Không thể thêm vào giỏ mượn'}`);
            } else if (error.request) {
                console.error("🌐 Network error - Không nhận được response");
                alert("❌ Lỗi kết nối: Không thể kết nối đến server");
            } else {
                console.error("⚡ Other error:", error.message);
                alert(`❌ Lỗi: ${error.message}`);
            }
        } finally {
            setAddingToCart(false);
        }
    };

    const handleAddToCartPurchase = async () => {
        if (!book || !book.GiaBan || purchaseQuantity < 1) return;
        if (purchaseQuantity > book.SoLuongTon) {
            alert(`⚠️ Số lượng mua tối đa là ${book.SoLuongTon}.`);
            return;
        }

        // Kiểm tra đăng nhập
        const token = localStorage.getItem('token');
        if (!token) {
            alert('🔐 Vui lòng đăng nhập để sử dụng chức năng mua sách');
            navigate('/login', { state: { from: '/books/' + id } });
            return;
        }

        console.log("🛍️ Bắt đầu thêm vào giỏ mua...");
        setAddingToCart(true);
        
        try {
            const requestData = {
                maSach: book.MaSach,
                soLuong: purchaseQuantity
            };
            console.log("📤 Gửi request đến API...");
            console.log("📦 Dữ liệu gửi:", requestData);
            
            const response = await addToPurchaseCart(requestData);
            console.log("✅ Response từ server:", response);

            if (response.code === 200 || response.status === 200) {
                alert(`✅ Đã thêm ${purchaseQuantity} cuốn "${book.TenSach}" vào Giỏ Mua!`);
                navigate("/checkout");
            } else {
                alert(`❌ Lỗi: ${response.message || 'Không thể thêm vào giỏ mua'}`);
            }
        } catch (error) {
            console.error("❌ Lỗi thêm vào giỏ mua:", error);
            
            if (error.response) {
                alert(`❌ Lỗi server: ${error.response.status} - ${error.response.data?.message || 'Không thể thêm vào giỏ mua'}`);
            } else if (error.request) {
                alert("❌ Lỗi kết nối: Không thể kết nối đến server");
            } else {
                alert(`❌ Lỗi: ${error.message}`);
            }
        } finally {
            setAddingToCart(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    if (loading) {
        return (
            <Layout>
                <div className="book-detail-loading">
                    <div className="loading-spinner"></div>
                    <p>Đang tải thông tin sách...</p>
                </div>
            </Layout>
        );
    }

    if (!book || apiError) {
        return (
            <Layout>
                <div className="book-detail-error">
                    <h2>📖 Không tìm thấy sách</h2>
                    <p>Không thể tải thông tin sách với mã: <strong>{id}</strong></p>
                    <div className="error-actions">
                        <button 
                            onClick={() => navigate('/books')}
                            className="back-to-books-btn"
                        >
                            ← Quay lại danh sách sách
                        </button>
                        <button 
                            onClick={() => window.location.reload()}
                            className="retry-btn"
                        >
                            🔄 Thử lại
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="book-detail-container">
                <h2 className="book-detail-title">📖 Chi tiết sách</h2>

                <div className="book-detail-content">
                    <div className="book-image-section">
                        <img 
                            src={book.AnhMinhHoa} 
                            alt={book.TenSach} 
                            className="book-detail-image"
                            onError={(e) => {
                                e.target.src = "https://via.placeholder.com/300x400.png?text=No+Image";
                            }}
                        />
                    </div>
                    
                    <div className="book-info-section">
                        <div className="book-basic-info">
                            <p><span className="info-label">Mã sách:</span> {book.MaSach}</p>
                            <h3 className="book-title">{book.TenSach}</h3>
                            <p><span className="info-label">Tác giả:</span> {book.TenTG}</p>
                            <p><span className="info-label">Danh mục:</span> {book.TenDM}</p>
                            <p><span className="info-label">Năm xuất bản:</span> {book.NamXuatBan}</p>
                            <p><span className="info-label">Mô tả:</span> {book.MoTa}</p>
                        </div>
                        
                        <div className="book-pricing-info">
                            {book.GiaBan && (
                                <p className="book-price">
                                    <span className="info-label">Giá bán:</span> 
                                    <span className="price-value">{formatCurrency(book.GiaBan)}</span>
                                </p>
                            )}
                            <p className="book-stock">
                                <span className="info-label">Số lượng còn:</span> 
                                <span className={`stock-value ${book.SoLuongTon > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                    {book.SoLuongTon}
                                </span>
                            </p>
                        </div>

                        {book.TinhTrang === "Còn" && book.SoLuongTon > 0 && (
                            <div className="book-actions">
                                <div className="action-section borrow-section">
                                    <h4>Chức năng MƯỢN</h4>
                                    <button
                                        onClick={handleAddToCartBorrow}
                                        disabled={addingToCart}
                                        className="btn-borrow-cart"
                                    >
                                        {addingToCart ? '⏳ Đang xử lý...' : '📚 Thêm vào Giỏ MƯỢN'}
                                    </button>
                                </div>

                                {book.GiaBan && (
                                    <div className="action-section purchase-section">
                                        <h4>Chức năng MUA</h4>
                                        <div className="quantity-selector">
                                            <label>Số lượng:</label>
                                            <input
                                                type="number"
                                                value={purchaseQuantity}
                                                onChange={handleQuantityChange}
                                                min="1"
                                                max={book.SoLuongTon}
                                                disabled={addingToCart}
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddToCartPurchase}
                                            disabled={addingToCart || purchaseQuantity > book.SoLuongTon}
                                            className="btn-purchase-cart"
                                        >
                                            {addingToCart ? '⏳ Đang xử lý...' : '🛒 Thêm vào Giỏ MUA'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {(book.TinhTrang !== "Còn" || book.SoLuongTon === 0) && (
                            <div className="out-of-stock-message">
                                <p>❌ Sách hiện không khả dụng để mượn hoặc mua</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}