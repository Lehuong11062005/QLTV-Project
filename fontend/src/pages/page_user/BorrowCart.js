// src/pages/page_user/BorrowCart.js
import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import ConfirmDialog from "../../components/ConfirmDialog";
import { 
  getLoanCart, 
  updateLoanCartItem, 
  removeFromLoanCart, 
  clearLoanCart 
} from "../../services/cartService";
import { createBorrowOrder } from "../../services/borrowService";

// Import file CSS
import "./BorrowCart.css";

// --- CẤU HÌNH CỐ ĐỊNH ---
const MAX_BORROW_LIMIT = 5; 
const MAX_BORROW_DAYS = 14;

export default function BorrowCart() {
    const [borrowCart, setBorrowCart] = useState({ chiTiet: [] });
    const [borrowDays, setBorrowDays] = useState(7); 
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState("");
    const [confirmAction, setConfirmAction] = useState(() => {});
    const [loading, setLoading] = useState(false); 
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // 🔹 TẢI GIỎ MƯỢN TỪ API
    const loadBorrowCart = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getLoanCart();
            
            // 🔥 QUAN TRỌNG: Xử lý dữ liệu trả về linh hoạt
            // API có thể trả về response.data hoặc response.data.data tùy config axios
            const cartData = response.data?.data || response.data || { chiTiet: [] };
            
            console.log("🛒 Data giỏ mượn nhận được:", cartData); // Debug log
            setBorrowCart(cartData);

        } catch (error) {
            console.error("❌ Lỗi tải giỏ mượn:", error);
            setErrorMessage("Không thể tải giỏ mượn. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBorrowCart();
    }, [loadBorrowCart]);

    // --- LOGIC XỬ LÝ DỮ LIỆU ---
    // 🔥 Sửa: Dùng đúng tên trường (soLuongYeuCau) từ API bạn cung cấp
    const totalQuantity = borrowCart.chiTiet?.reduce((sum, item) => sum + (item.soLuongYeuCau || 1), 0) || 0;
    const isOverLimit = totalQuantity > MAX_BORROW_LIMIT;

    const handleConfirm = useCallback((message, action) => {
        setConfirmMessage(message);
        setConfirmAction(() => action);
        setShowConfirm(true);
    }, []);

    const handleCancel = useCallback(() => setShowConfirm(false), []);

    // 🎯 XÓA SÁCH KHỎI GIỎ MƯỢN
    const handleRemove = useCallback(async (maSach) => {
        try {
            const response = await removeFromLoanCart(maSach);
            // Check cả code 200 và 204
            if (response.code === 200 || response.status === 200 || response.status === 204) {
                await loadBorrowCart();
                setSuccessMessage("✅ Đã xóa sách khỏi giỏ mượn");
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (error) {
            console.error("❌ Lỗi xóa sách:", error);
            setErrorMessage("Không thể xóa sách. Vui lòng thử lại.");
        }
        setShowConfirm(false);
    }, [loadBorrowCart]);

    // 🎯 CẬP NHẬT SỐ LƯỢNG
    const handleQuantityChange = useCallback(async (maSach, newQuantity) => {
        const quantity = Math.max(1, parseInt(newQuantity) || 1);
        try {
            const response = await updateLoanCartItem(maSach, quantity);
            if (response.code === 200 || response.status === 200) {
                await loadBorrowCart();
            }
        } catch (error) {
            console.error("❌ Lỗi cập nhật số lượng:", error);
            setErrorMessage("Không thể cập nhật số lượng. Vui lòng thử lại.");
        }
    }, [loadBorrowCart]);

    // 🔹 XÓA TOÀN BỘ GIỎ MƯỢN
    const handleClearCart = useCallback(async () => {
        handleConfirm(
            "Xác nhận xóa toàn bộ giỏ mượn?",
            async () => {
                try {
                    const response = await clearLoanCart();
                    if (response.code === 200 || response.status === 200) {
                        await loadBorrowCart();
                        setSuccessMessage("✅ Đã xóa toàn bộ giỏ mượn");
                        setTimeout(() => setSuccessMessage(''), 3000);
                    }
                } catch (error) {
                    console.error("❌ Lỗi xóa giỏ mượn:", error);
                    setErrorMessage("Không thể xóa giỏ mượn. Vui lòng thử lại.");
                }
            }
        );
    }, [handleConfirm, loadBorrowCart]);

    // 🔹 GỬI YÊU CẦU MƯỢN
    const handleBorrowAll = useCallback(async () => {
        if (borrowCart.chiTiet?.length === 0) return;
        if (isOverLimit || borrowDays < 1 || borrowDays > MAX_BORROW_DAYS) return;

        setLoading(true); 
        setErrorMessage('');
        setSuccessMessage('');
        setShowConfirm(false);

        try {
            const payload = {
                ghiChu: `Mượn ${totalQuantity} cuốn trong ${borrowDays} ngày`,
                hanTraDuKien: new Date(Date.now() + borrowDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
            
            const response = await createBorrowOrder(payload);
            
            // Xử lý response thông minh
            const resData = response.data || response;

            if (resData.code === 200) {
                await clearLoanCart();
                await loadBorrowCart();
                setSuccessMessage(`✅ ${resData.message || "Đã gửi yêu cầu mượn sách thành công!"}`);
            } else {
                setErrorMessage(`Lỗi: ${resData.message}`);
            }

        } catch (error) {
            console.error("❌ Lỗi khi gửi yêu cầu mượn:", error);
            const errorMsg = error.response?.data?.message || error.message || 'Lỗi kết nối Server.';
            setErrorMessage(`Gửi yêu cầu thất bại: ${errorMsg}`);
            
        } finally {
            setLoading(false); 
        }
    }, [borrowCart, isOverLimit, borrowDays, totalQuantity, loadBorrowCart]);

    // Kiểm tra điều kiện để disable nút submit
    const isSubmitDisabled = loading || isOverLimit || !borrowCart.chiTiet || borrowCart.chiTiet.length === 0;

    return (
        <Layout>
            <h2 className="cart-header">📚 Giỏ Mượn Sách</h2>

            {/* THÔNG BÁO */}
            {errorMessage && (
                <div className="alert-box alert-error">❌ {errorMessage}</div>
            )}
            {successMessage && (
                <div className="alert-box alert-success">{successMessage}</div>
            )}
            
            {/* NỘI DUNG GIỎ HÀNG */}
            {loading && (!borrowCart.chiTiet || borrowCart.chiTiet.length === 0) ? (
                <div className="cart-empty">
                    <p>Đang tải giỏ mượn...</p>
                </div>
            ) : (!borrowCart.chiTiet || borrowCart.chiTiet.length === 0) ? (
                <div className="cart-empty">
                    <p className="cart-empty-title">
                        🛒 Giỏ mượn của bạn đang trống
                    </p>
                    <p>
                        <a href="/books" className="link-highlight">
                            📖 Khám phá thư viện ngay!
                        </a>
                    </p>
                </div>
            ) : (
                <div className="cart-card">
                    {/* NÚT XÓA TOÀN BỘ */}
                    <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                        <button
                            onClick={handleClearCart}
                            className="btn btn-remove btn-clear"
                        >
                            🗑️ Xóa tất cả
                        </button>
                    </div>

                    {/* BẢNG SÁCH */}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="cart-table">
                            <thead>
                                <tr>
                                    <th>Mã sách</th>
                                    <th>Tên sách</th>
                                    <th>Tồn kho</th>
                                    <th>Số lượng mượn</th> 
                                    <th style={{ textAlign: 'center' }}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {borrowCart.chiTiet.map((book) => (
                                    <tr key={book.MaSach}>
                                        {/* 🔥 SỬA LỖI CHÍNH Ở ĐÂY: Dùng PascalCase khớp với API */}
                                        <td>{book.MaSach}</td>
                                        <td>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                {book.AnhMinhHoa && (
                                                    <img 
                                                        src={book.AnhMinhHoa} 
                                                        alt={book.TenSach} 
                                                        style={{width: '40px', height: '60px', objectFit: 'cover'}}
                                                    />
                                                )}
                                                {book.TenSach}
                                            </div>
                                        </td>
                                        <td>{book.SoLuongTon}</td> 
                                        <td>
                                            <input 
                                                type="number" 
                                                // 🔥 Dùng soLuongYeuCau từ API
                                                value={book.soLuongYeuCau || 1} 
                                                min="1" 
                                                max={book.SoLuongTon || 100} 
                                                className="input-quantity"
                                                // 🔥 Truyền MaSach chuẩn
                                                onChange={(e) => handleQuantityChange(book.MaSach, e.target.value)}
                                            />
                                        </td> 
                                        <td style={{ textAlign: "center" }}>
                                            <button
                                                onClick={() =>
                                                    handleConfirm(
                                                        `Xác nhận xóa "${book.TenSach}" khỏi giỏ mượn?`,
                                                        () => handleRemove(book.MaSach)
                                                    )
                                                }
                                                className="btn btn-remove"
                                            >
                                                🗑️ Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* THÔNG TIN MƯỢN & FOOTER */}
                    <div className="cart-footer">
                        <div className="cart-footer-row">
                            <label style={{ fontWeight: '600', marginRight: '10px', color: '#4b5563' }}>
                                Số ngày mượn (Tối đa {MAX_BORROW_DAYS} ngày):
                            </label>
                            <input 
                                type="number" 
                                value={borrowDays} 
                                onChange={(e) => setBorrowDays(Math.max(1, Math.min(MAX_BORROW_DAYS, parseInt(e.target.value) || 7)))}
                                min="1"
                                max={MAX_BORROW_DAYS}
                                className="input-days"
                            />
                        </div>

                        <div className="summary-section">
                            <strong className={`summary-total ${isOverLimit ? 'text-danger' : 'text-success'}`}>
                                Tổng số cuốn sách: {totalQuantity} cuốn
                            </strong>
                            
                            {isOverLimit && (
                                <p className="warning-text">
                                    ⚠️ Vượt quá giới hạn mượn tối đa ({MAX_BORROW_LIMIT} cuốn)! Vui lòng điều chỉnh.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* NÚT GỬI YÊU CẦU */}
                    <div className="action-section">
                        <button
                            className="btn btn-primary"
                            disabled={isSubmitDisabled}
                            onClick={() =>
                                handleConfirm(
                                    `Xác nhận gửi yêu cầu mượn ${totalQuantity} cuốn sách trong ${borrowDays} ngày?`,
                                    handleBorrowAll
                                )
                            }
                        >
                            {loading ? "⏳ Đang gửi yêu cầu..." : `📨 Gửi yêu cầu mượn (${totalQuantity} cuốn)`}
                        </button>
                    </div>
                </div>
            )}

            {/* CONFIRM DIALOG */}
            {showConfirm && (
                <ConfirmDialog
                    message={confirmMessage}
                    onConfirm={confirmAction}
                    onCancel={handleCancel}
                />
            )}
        </Layout>
    );
}