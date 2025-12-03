// src/pages/page_user/Checkout.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { getPurchaseCart, updatePurchaseCartItem, removeFromPurchaseCart } from "../../services/cartService";
import { createOrder } from "../../services/orderService";
import "./Checkout.css";

export default function Checkout() {
    const navigate = useNavigate();
    
    // --- STATE ---
    const [cart, setCart] = useState({ chiTiet: [] });
    const [address, setAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("COD"); // Mặc định
    
    // State trạng thái UI
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [successId, setSuccessId] = useState(null); // Lưu mã đơn hàng thành công

    // Helper format tiền
    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

    // 1. Tải giỏ hàng
    const loadPurchaseCart = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getPurchaseCart();
            const cartData = response.data?.data || response.data || { chiTiet: [] };
            setCart(cartData);
        } catch (error) {
            console.error("Lỗi tải giỏ:", error);
            setApiError("Không thể tải giỏ hàng.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPurchaseCart();
    }, [loadPurchaseCart]);

    // Tính toán tổng tiền
    const totalAmount = cart.chiTiet?.reduce((sum, item) => sum + (item.thanhTien || 0), 0) || 0;
    const shippingFee = 30000;
    const finalTotal = totalAmount + shippingFee;

    // 2. XỬ LÝ ĐẶT HÀNG (Logic chính)
    const handleCheckout = async () => {
        setApiError(null);

        // Validation bằng UI text (Không dùng alert)
        if (!address.trim()) {
            setApiError("⚠️ Vui lòng nhập địa chỉ giao hàng!");
            return;
        }
        if (!cart.chiTiet || cart.chiTiet.length === 0) {
            setApiError("⚠️ Giỏ hàng đang trống!");
            return;
        }

        setLoading(true);
        try {
            const orderData = {
                diaChiGiaoHang: address,
                phuongThucThanhToan: paymentMethod,
                phiVanChuyen: shippingFee,
                tongTien: finalTotal
            };

            const result = await createOrder(orderData);
            const resData = result.data || result;

            // Kiểm tra thành công (Code 200/201 hoặc có trả về MaDH)
            if (result.status === 200 || result.status === 201 || resData.MaDH) {
                
                // A. Xóa giỏ hàng hiển thị
                setCart({ chiTiet: [] });
                
                // B. Lưu mã đơn để hiện thông báo
                setSuccessId(resData.MaDH || "Mới");

                // C. Chuyển hướng sau 2 giây sang trang THANH TOÁN
                setTimeout(() => {
                    navigate('/user/payments'); 
                }, 2000);

            } else {
                throw new Error(resData.message || "Lỗi xử lý từ server");
            }

        } catch (error) {
            console.error("Lỗi đặt hàng:", error);
            const msg = error.response?.data?.message || error.message || "Đặt hàng thất bại.";
            setApiError(`❌ ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    // 3. Các hàm phụ trợ (Xóa/Sửa số lượng)
    const handleRemoveItem = async (maSach) => {
        if (!window.confirm("Xóa sách này khỏi đơn hàng?")) return;
        try {
            await removeFromPurchaseCart(maSach);
            loadPurchaseCart();
        } catch (e) { setApiError("Lỗi khi xóa sách"); }
    };

    const handleUpdateQuantity = async (maSach, newQty) => {
        if (newQty < 1) return;
        try {
            await updatePurchaseCartItem(maSach, newQty);
            loadPurchaseCart();
        } catch (e) { setApiError("Lỗi cập nhật số lượng"); }
    };

    // --- RENDER GIAO DIỆN ---
    
    // Màn hình thành công
    if (successId) {
        return (
            <Layout>
                <div className="checkout-container">
                    <div className="alert-box alert-success" style={{textAlign: 'center', padding: '40px'}}>
                        <h2 style={{fontSize: '1.8em', marginBottom: '15px'}}>🎉 Đặt hàng thành công!</h2>
                        <p style={{fontSize: '1.2em'}}>Mã đơn hàng: <b>#{successId}</b></p>
                        
                        <div style={{margin: '20px 0', color: '#666'}}>
                            <p>Đơn hàng đã được tạo.</p>
                            <p>Đang chuyển đến trang thanh toán...</p>
                        </div>
                        
                        <div className="spinner-small" style={{margin: '0 auto'}}></div>
                    </div>
                </div>
            </Layout>
        );
    }

    // Màn hình Form Checkout
    return (
        <Layout>
            <div className="checkout-container">
                <h2 className="checkout-title">🧾 Xác nhận đơn hàng</h2>

                {apiError && <div className="alert-box alert-error">{apiError}</div>}

                {loading && !cart.chiTiet?.length ? (
                    <div className="empty-cart"><p>Đang tải dữ liệu...</p></div>
                ) : (!cart.chiTiet || cart.chiTiet.length === 0) ? (
                    <div className="empty-cart">
                        <p>Giỏ hàng trống.</p>
                        <Link to="/books" className="link-home">⬅ Quay lại mua sách</Link>
                    </div>
                ) : (
                    <>
                        {/* Bảng sản phẩm */}
                        <div style={{ overflowX: 'auto' }}>
                            <table className="checkout-table">
                                <thead>
                                    <tr>
                                        <th>Sản phẩm</th>
                                        <th>Đơn giá</th>
                                        <th>Số lượng</th>
                                        <th>Thành tiền</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.chiTiet.map((item) => (
                                        <tr key={item.MaSach}>
                                            <td className="item-name">
                                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                    {item.AnhMinhHoa && (
                                                        <img src={item.AnhMinhHoa} alt="Book" style={{width:'40px', height:'60px', objectFit:'cover'}} />
                                                    )}
                                                    {item.TenSach}
                                                </div>
                                            </td>
                                            <td>{formatCurrency(item.donGia)}</td>
                                            <td>
                                                <div className="quantity-control">
                                                    <button className="btn-quantity" onClick={() => handleUpdateQuantity(item.MaSach, item.soLuongMua - 1)} disabled={loading}>-</button>
                                                    <span>{item.soLuongMua}</span>
                                                    <button className="btn-quantity" onClick={() => handleUpdateQuantity(item.MaSach, item.soLuongMua + 1)} disabled={loading}>+</button>
                                                </div>
                                            </td>
                                            <td className="price-text">{formatCurrency(item.thanhTien)}</td>
                                            <td>
                                                <button className="btn-remove" onClick={() => handleRemoveItem(item.MaSach)}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Tổng tiền */}
                        <div className="order-summary">
                            <div className="summary-row">
                                <span>Tiền hàng:</span>
                                <span>{formatCurrency(totalAmount)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Phí vận chuyển:</span>
                                <span>{formatCurrency(shippingFee)}</span>
                            </div>
                            <div className="summary-row total">
                                <span className="total-label">Tổng thanh toán:</span>
                                <span className="total-amount">{formatCurrency(finalTotal)}</span>
                            </div>
                        </div>

                        {/* Form nhập liệu */}
                        <div className="checkout-form">
                            <h4 style={{ marginBottom: '15px', color: '#374151' }}>📦 Thông tin giao hàng</h4>
                            
                            <div className="form-group">
                                <label className="form-label">Địa chỉ nhận hàng (*):</label>
                                <textarea
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Số nhà, đường, phường/xã..."
                                    rows="2"
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
                                    <option value="MoMo">Ví điện tử MoMo</option>
                                </select>
                                <small style={{display:'block', marginTop:'5px', color:'#6b7280'}}>
                                    * Bạn sẽ thực hiện thanh toán ở bước tiếp theo.
                                </small>
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={loading || !cart.chiTiet.length}
                                className="btn-checkout"
                            >
                                {loading ? "Đang xử lý..." : "✅ XÁC NHẬN ĐẶT HÀNG"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}