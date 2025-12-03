// src/pages/page_user/Checkout.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { getPurchaseCart, updatePurchaseCartItem, removeFromPurchaseCart } from "../../services/cartService";
import { createOrder } from "../../services/orderService";

// Import file CSS
import "./Checkout.css";

export default function Checkout() {
    const navigate = useNavigate();
    const [cart, setCart] = useState({ chiTiet: [] });
    const [address, setAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("COD");
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // 🔹 TẢI GIỎ MUA TỪ API
    const loadPurchaseCart = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getPurchaseCart();
            
            // 🔥 Xử lý cấu trúc response linh hoạt
            const cartData = response.data?.data || response.data || { chiTiet: [] };
            
            console.log("🛒 Data giỏ mua:", cartData); // Debug xem log
            setCart(cartData);

        } catch (error) {
            console.error("❌ Lỗi tải giỏ mua:", error);
            setApiError("Không thể tải giỏ mua. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPurchaseCart();
    }, [loadPurchaseCart]);

    // Tính tổng tiền (dùng đúng tên trường từ API)
    const total = cart.chiTiet?.reduce((sum, item) => sum + (item.thanhTien || 0), 0) || 0;

    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return '0 VNĐ';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleCheckout = async () => {
    setApiError(null);
    setSuccessMessage('');

    if (!address.trim()) {
        alert("Vui lòng nhập địa chỉ giao hàng!");
        return;
    }
    if (!cart.chiTiet || cart.chiTiet.length === 0) {
        alert("Giỏ hàng đang trống!");
        return;
    }

    setLoading(true);
    try {
        const orderData = {
            diaChiGiaoHang: address,
            phuongThucThanhToan: paymentMethod,
            // Giả định phí vận chuyển là 30000 VNĐ
            phiVanChuyen: 30000 
        };

        const result = await createOrder(orderData);
        
        // Xử lý response từ createOrder
        const resData = result.data || result;

        // API Backend của bạn trả về { message, MaDH, ... }
        // Cần kiểm tra status HTTP hoặc cấu trúc response.
        // Dựa trên console.log trong ảnh, response là thành công (status 200).
        if (result.status === 201 || result.status === 200 || resData.message) {
            
            // ✅ THAY ĐỔI LỚN TẠI ĐÂY: XÓA GIỎ HÀNG KHỎI LOCAL STATE VÀ CHUYỂN HƯỚNG
            
            // 1. Xóa Giỏ hàng khỏi state local để hiển thị ngay lập tức là trống rỗng
            setCart({ chiTiet: [] }); 
            
            // 2. Hiển thị thông báo thành công
            setSuccessMessage(`✅ Đặt hàng thành công! Mã đơn: ${resData.MaDH || 'Vui lòng kiểm tra lịch sử đơn hàng.'}`);
            
            // 3. Chuyển hướng người dùng sau 2 giây (Đây là hành động quan trọng nhất)
            setTimeout(() => {
                // Chuyển hướng sang trang lịch sử đơn hàng để xác nhận
                navigate('/user/history'); 
            }, 2000);
            
        } else {
            // Xử lý lỗi từ server (nếu code != 200/201)
            setApiError(`❌ Lỗi: ${resData.message || "Đã có lỗi xảy ra."}`);
        }

    } catch (error) {
        console.error("❌ Lỗi khi đặt hàng:", error);
        const errorMessage = error.response?.data?.message || error.message || "Lỗi kết nối server.";
        setApiError(`❌ Đặt hàng thất bại: ${errorMessage}`);
    } finally {
        setLoading(false);
    }
};

    const handleRemoveItem = async (maSach) => {
        if (!window.confirm("Bạn có chắc muốn xóa sách này khỏi giỏ hàng?")) return;
        try {
            const response = await removeFromPurchaseCart(maSach);
            // Check cả 200 và 204 (No Content)
            if (response.code === 200 || response.status === 200 || response.status === 204) {
                await loadPurchaseCart();
            }
        } catch (error) {
            console.error("❌ Lỗi xóa sách:", error);
            setApiError("Không thể xóa sách. Vui lòng thử lại.");
        }
    };

    const handleUpdateQuantity = async (maSach, newQuantity) => {
        if (newQuantity < 1) return;

        try {
            const response = await updatePurchaseCartItem(maSach, newQuantity);
            if (response.code === 200 || response.status === 200) {
                await loadPurchaseCart();
            }
        } catch (error) {
            console.error("❌ Lỗi cập nhật số lượng:", error);
            setApiError("Không thể cập nhật số lượng. Vui lòng thử lại.");
        }
    };

    return (
        <Layout>
            <h2 className="checkout-title">🧾 Xác nhận đơn hàng MUA</h2>

            {successMessage && (
                <div className="alert-box alert-success">{successMessage}</div>
            )}

            {apiError && (
                <div className="alert-box alert-error">{apiError}</div>
            )}

            {loading && (!cart.chiTiet || cart.chiTiet.length === 0) ? (
                 <div className="empty-cart"><p>Đang tải giỏ hàng...</p></div>
            ) : (!cart.chiTiet || cart.chiTiet.length === 0) ? (
                <div className="empty-cart">
                    <p>Không có sản phẩm nào trong giỏ hàng.</p>
                    <p>Vui lòng quay lại <Link to="/books" className="link-home">trang sách</Link> để mua hàng.</p>
                </div>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="checkout-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40%' }}>Tên sách</th>
                                    <th>Đơn giá</th>
                                    <th>Số lượng</th>
                                    <th>Thành tiền</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.chiTiet.map((item) => (
                                    <tr key={item.MaSach}> 
                                        {/* 🔥 SỬA LỖI Ở ĐÂY: Dùng MaSach, TenSach (PascalCase) */}
                                        <td className="item-name">
                                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                 {item.AnhMinhHoa && (
                                                    <img 
                                                        src={item.AnhMinhHoa} 
                                                        alt={item.TenSach} 
                                                        style={{width: '40px', height: '60px', objectFit: 'cover'}} 
                                                    />
                                                )}
                                                {item.TenSach}
                                            </div>
                                        </td>
                                        
                                        {/* Các trường dưới đây API trả về camelCase nên giữ nguyên */}
                                        <td className="price-text">{formatCurrency(item.donGia)}</td>
                                        <td>
                                            <div className="quantity-control">
                                                <button
                                                    className="btn-quantity"
                                                    onClick={() => handleUpdateQuantity(item.MaSach, item.soLuongMua - 1)}
                                                    disabled={item.soLuongMua <= 1 || loading}
                                                >
                                                    -
                                                </button>
                                                <span>{item.soLuongMua}</span>
                                                <button
                                                    className="btn-quantity"
                                                    onClick={() => handleUpdateQuantity(item.MaSach, item.soLuongMua + 1)}
                                                    disabled={loading}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td className="price-text total-item-price">
                                            {formatCurrency(item.thanhTien)}
                                        </td>
                                        <td>
                                            <button
                                                className="btn-remove"
                                                onClick={() => handleRemoveItem(item.MaSach)}
                                                disabled={loading}
                                            >
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="order-summary">
                        <span className="total-label">Tổng cộng:</span>
                        <span className="total-amount">{formatCurrency(total)}</span>
                    </div>

                    {/* FORM ĐỊA CHỈ */}
                    <div className="checkout-form">
                        <h4 style={{ marginBottom: '15px', fontSize: '1.1em', color: '#1f2937' }}>
                            📦 Thông tin giao hàng & thanh toán
                        </h4>
                        
                        <div className="form-group">
                            <label className="form-label">Địa chỉ giao hàng:</label>
                            <textarea
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
                                rows="3"
                                className="input-address"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phương thức thanh toán:</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="select-payment"
                            >
                                <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                                <option value="Bank">Chuyển khoản ngân hàng</option>
                                <option value="MoMo">Ví MoMo</option>
                            </select>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={loading || !cart.chiTiet || cart.chiTiet.length === 0 || !address.trim()}
                            className="btn-checkout"
                        >
                            {loading ? "Đang xử lý..." : "✅ Xác nhận và Đặt hàng"}
                        </button>
                    </div>
                </>
            )}
        </Layout>
    );
}