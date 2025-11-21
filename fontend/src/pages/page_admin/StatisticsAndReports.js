import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import statisticService from "../../services/statisticsService";
import "./StatisticsAndReports.css"; // Import file CSS vừa tạo

export default function StatisticsAndReports() {
    const [topBooks, setTopBooks] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Hàm format tiền tệ VNĐ
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const [booksRes, inventoryRes, revenueRes] = await Promise.all([
            statisticService.getTopBorrowedBooks(),
            statisticService.getInventoryReport(),
            statisticService.getMonthlyRevenue()
        ]);
        
        // 👇 LOG ĐỂ KIỂM TRA DỮ LIỆU (F12 -> Console)
        console.log("Books Res:", booksRes);
        console.log("Inventory Res:", inventoryRes);

        // 👇 SỬA: Lấy .data để có được mảng thực sự
        // Nếu axios của bạn trả về full response, dữ liệu nằm trong booksRes.data
        // Nếu axios interceptor đã xử lý, có thể nó nằm trực tiếp ở booksRes
        
        // Cách an toàn nhất: Kiểm tra xem nó có phải mảng không, nếu không thì lấy .data
        const booksData = Array.isArray(booksRes) ? booksRes : (booksRes.data || []);
        const inventoryData = Array.isArray(inventoryRes) ? inventoryRes : (inventoryRes.data || []);
        
        // Riêng Revenue trả về object { year:..., data: [...] } nên cần chọc sâu hơn
        const revenueDataObj = revenueRes.data || revenueRes; 
        const revenueArray = revenueDataObj.data || [];

        setTopBooks(booksData);
        setInventory(inventoryData);
        setMonthlyRevenue(revenueArray);

    } catch (err) {
        console.error("Lỗi khi tải báo cáo:", err);
        setError("Không thể tải dữ liệu báo cáo từ API.");
    } finally {
        setIsLoading(false);
    }
};

    // Component hiển thị Bảng (Reusable)
    // headers: Mảng tên cột
    // renderRow: Hàm render từng dòng dữ liệu (giúp tùy biến hiển thị ảnh, tiền tệ...)
    const ReportCard = ({ title, data, headers, renderRow }) => (
    <div className="report-card">
        <h3 className="card-title">{title}</h3>
        
        {/* 👇 SỬA: Thêm kiểm tra Array.isArray(data) */}
        {!data || !Array.isArray(data) || data.length === 0 ? (
            <p className="text-center" style={{ color: '#9ca3af', padding: '20px' }}>
                Chưa có dữ liệu phát sinh.
            </p>
        ) : (
            <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                    <thead>
                        <tr>
                            {headers.map((h, i) => <th key={i}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => renderRow(item, index))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

    if (isLoading) {
        return (
            <Layout>
                <div className="loading-container">
                    <span>🔄 Đang tổng hợp dữ liệu thống kê...</span>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="stats-container">
                <div className="stats-header">
                    <h2 className="stats-title">📈 Trung tâm Báo cáo & Thống kê</h2>
                </div>

                {error && <div className="error-msg">⚠️ {error}</div>}

                <div className="reports-grid">
                    {/* 1. Bảng Sách Mượn Nhiều Nhất */}
                    <ReportCard 
                        title="🔥 Top 10 Sách Mượn Nhiều Nhất"
                        data={topBooks}
                        headers={['Sách', 'Lượt mượn']} // Gộp cột ảnh và tên cho đẹp
                        renderRow={(book, index) => (
                            <tr key={book.MaSach || index}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {/* Hiển thị ảnh thumbnail */}
                                        <img 
                                            src={book.AnhMinhHoa || "https://via.placeholder.com/40"} 
                                            alt="" 
                                            className="book-thumb"
                                            onError={(e) => e.target.src = "https://via.placeholder.com/40?text=Book"}
                                        />
                                        <div>
                                            <div className="font-bold">{book.TenSach}</div>
                                            <small style={{color:'#6b7280'}}>{book.MaSach}</small>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-center">
                                    <span style={{
                                        background: '#dbeafe', color: '#1e40af', 
                                        padding: '4px 8px', borderRadius: '10px', fontWeight: 'bold'
                                    }}>
                                        {book.TotalBorrowTimes}
                                    </span>
                                </td>
                            </tr>
                        )}
                    />

                    {/* 2. Bảng Doanh Thu Theo Tháng */}
                    <ReportCard 
                        title={`💰 Doanh Thu Năm ${new Date().getFullYear()}`}
                        data={monthlyRevenue}
                        headers={['Tháng', 'Doanh thu']}
                        renderRow={(row, index) => (
                            <tr key={index}>
                                <td>{row.name}</td>
                                <td className={`text-right font-bold ${row.revenue > 0 ? 'text-success' : ''}`}>
                                    {formatCurrency(row.revenue)}
                                </td>
                            </tr>
                        )}
                    />

                    {/* 3. Bảng Tồn Kho (Chiếm toàn bộ chiều rộng nếu cần, hoặc để trong grid) */}
                    <div style={{ gridColumn: '1 / -1' }}> {/* Hack: Để bảng này dài full chiều ngang */}
                        <ReportCard 
                            title="📦 Báo Cáo Tồn Kho Theo Danh Mục"
                            data={inventory}
                            headers={['Danh mục', 'Số đầu sách', 'Tổng tồn kho']}
                            renderRow={(cat, index) => (
                                <tr key={index}>
                                    <td>{cat.TenDM}</td>
                                    <td>{cat.TotalUniqueBooks} đầu sách</td>
                                    <td className="font-bold">{cat.TotalStockQuantity} cuốn</td>
                                </tr>
                            )}
                        />
                    </div>
                </div>
            </div>
        </Layout>
    );
}