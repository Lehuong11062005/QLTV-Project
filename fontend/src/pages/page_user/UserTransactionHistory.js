// src/pages/page_user/UserTransactionHistory.js
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getMyTransactions } from "../../services/paymentService"; // Dùng hàm dành riêng cho User
import "./UserTransactionHistory.css";

export default function UserTransactionHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await getMyTransactions();
            setHistory(res.data);
        } catch (error) {
            console.error("Lỗi tải lịch sử:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="history-container">
                <h2 className="page-title">🕒 Lịch Sử Giao Dịch</h2>
                
                {loading ? (
                    <div>Đang tải...</div>
                ) : (
                    <div className="table-responsive">
                        <table className="transaction-table">
                            <thead>
                                <tr>
                                    <th>Mã Giao Dịch</th>
                                    <th>Loại</th>
                                    <th>Nội dung</th>
                                    <th>Số tiền</th>
                                    <th>Thời gian</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center">Bạn chưa có giao dịch nào.</td></tr>
                                ) : (
                                    history.map(item => (
                                        <tr key={item.MaTT}>
                                            <td>
                                                <span className="trans-id">{item.MaTT}</span>
                                                <br/><small>{item.MaGiaoDich}</small>
                                            </td>
                                            <td>
                                                {item.LoaiGiaoDich === 'DonHang' 
                                                    ? <span className="tag tag-blue">🛒 Mua Sách</span> 
                                                    : <span className="tag tag-red">⚖️ Nộp Phạt</span>
                                                }
                                            </td>
                                            <td>{item.NoiDung || `Thanh toán cho ${item.MaDH || item.MaPhat}`}</td>
                                            <td className="font-bold">{item.SoTien?.toLocaleString()} đ</td>
                                            <td>{new Date(item.NgayThanhToan).toLocaleString('vi-VN')}</td>
                                            <td>
                                                <span className={`status-dot ${item.TrangThai === 'HoanThanh' ? 'success' : 'failed'}`}></span>
                                                {item.TrangThai}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
}