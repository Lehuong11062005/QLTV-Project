const sql = require('mssql');
// 👇 SỬA LẠI ĐƯỜNG DẪN CHO ĐÚNG VỚI PROJECT CỦA BẠN
const config = require('../db/dbConfig'); 

// ============================================================
// A. DASHBOARD (Tổng Quan Chỉ Số Chính)
// ============================================================

// GET /api/stats/dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        
        // 1. Users (Giữ nguyên)
        const totalUsers = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM DocGia) AS TotalDocGia,
                (SELECT COUNT(*) FROM ThuThu) AS TotalThuThu
        `);
        
        // 2. Books (Giữ nguyên)
        const totalBooks = await pool.request().query(`
            SELECT 
                ISNULL(SUM(SoLuongTon), 0) AS TotalStock,
                COUNT(MaSach) AS TotalUniqueBooks,
                (SELECT COUNT(*) FROM BanSao_ThuVien WHERE TrangThaiBanSao = N'SanSang') AS AvailableCopies
            FROM Sach
        `);
        
        // 3. Borrowing (Giữ nguyên)
        const borrowStats = await pool.request().query(`
            SELECT
                (SELECT COUNT(*) FROM MuonSach) AS TotalBorrowOrders,
                (SELECT COUNT(*) FROM MuonSach WHERE TrangThai = N'ChoDuyet') AS PendingBorrowOrders,
                (SELECT COUNT(*) FROM BanSao_ThuVien WHERE TrangThaiBanSao = 'DangMuon') AS CurrentlyBorrowed,
                (SELECT COUNT(MSS.MaBanSao) FROM MuonSach MS JOIN MuonSach_Sach MSS ON MS.MaMuon = MSS.MaMuon WHERE MS.TrangThai = N'QuaHan') AS OverdueBorrows
        `);

        // 4. 🔥 SỬA: TỔNG DOANH THU (Lấy trực tiếp từ bảng THANH TOÁN)
        // Chỉ tính những giao dịch có trạng thái 'HoanThanh'
        const totalRevenue = await pool.request().query(`
            SELECT 
                ISNULL(SUM(SoTien), 0) AS TotalRevenue,
                (SELECT COUNT(MaDH) FROM DonHang) AS TotalPurchaseOrders
            FROM ThanhToan
            WHERE TrangThai = N'HoanThanh'
        `);

        // 5. Feedback (Giữ nguyên)
        const feedbackStats = await pool.request().query(`
             SELECT COUNT(*) AS PendingFeedback FROM PhanHoi WHERE TrangThai = N'Chưa xử lý'
        `);
        
        res.json({
            users: totalUsers.recordset[0],
            books: {
                TotalStock: totalBooks.recordset[0].TotalStock,
                TotalUniqueBooks: totalBooks.recordset[0].TotalUniqueBooks,
                AvailableStock: totalBooks.recordset[0].AvailableCopies
            },
            borrowing: borrowStats.recordset[0],
            revenue: totalRevenue.recordset[0], 
            feedback: feedbackStats.recordset[0] 
        });

    } catch (err) {
        console.error('Lỗi Dashboard:', err);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

// ============================================================
// B. BÁO CÁO CHI TIẾT
// ============================================================

// GET /api/stats/report/top-borrowed
exports.getTopBorrowedBooks = async (req, res) => {
    const top = 10; 
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('topN', sql.Int, top)
            .query(`
                SELECT TOP (@topN)
                    S.MaSach, S.TenSach, S.AnhMinhHoa,
                    COUNT(MSS.MaBanSao) AS TotalBorrowTimes
                FROM MuonSach_Sach MSS
                JOIN BanSao_ThuVien BS ON MSS.MaBanSao = BS.MaBanSao
                JOIN Sach S ON BS.MaSach = S.MaSach
                GROUP BY S.MaSach, S.TenSach, S.AnhMinhHoa
                ORDER BY TotalBorrowTimes DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

exports.getInventoryReport = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT DM.TenDM, COUNT(S.MaSach) AS TotalUniqueBooks, ISNULL(SUM(S.SoLuongTon), 0) AS TotalStockQuantity
            FROM DanhMuc DM LEFT JOIN Sach S ON DM.MaDM = S.MaDM
            GROUP BY DM.TenDM ORDER BY TotalStockQuantity DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

// GET /api/stats/report/revenue-by-month
exports.getMonthlyRevenue = async (req, res) => {
    const currentYear = new Date().getFullYear(); 
    try {
        const pool = await sql.connect(config);
        
        // 🔥 SỬA: Tính tổng tiền theo tháng dựa trên ngày thanh toán thực tế (NgayThanhToan)
        // Từ bảng ThanhToan, không quan tâm nguồn gốc là Đơn hàng hay Phạt
        const result = await pool.request()
            .input('CurrentYear', sql.Int, currentYear)
            .query(`
                SELECT 
                    MONTH(NgayThanhToan) AS Month,
                    ISNULL(SUM(SoTien), 0) AS TotalRevenue
                FROM ThanhToan
                WHERE YEAR(NgayThanhToan) = @CurrentYear
                AND TrangThai = N'HoanThanh'
                GROUP BY MONTH(NgayThanhToan)
                ORDER BY Month
            `);
            
        // Chuẩn bị dữ liệu 12 tháng
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({ 
            name: `Tháng ${i + 1}`, 
            revenue: 0 
        }));
        
        // Map dữ liệu vào
        result.recordset.forEach(row => {
            if (row.Month >= 1 && row.Month <= 12) {
                monthlyData[row.Month - 1].revenue = row.TotalRevenue;
            }
        });

        res.json({ year: currentYear, data: monthlyData });
    } catch (err) {
        console.error('Lỗi báo cáo doanh thu:', err);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

// GET /api/stats/report/inventory
exports.getInventoryReport = async (req, res) => {
    try {
        const pool = await sql.connect(config); // Sửa kết nối
        const result = await pool.request().query(`
            SELECT
                DM.TenDM,
                COUNT(S.MaSach) AS TotalUniqueBooks,
                ISNULL(SUM(S.SoLuongTon), 0) AS TotalStockQuantity
            FROM DanhMuc DM
            LEFT JOIN Sach S ON DM.MaDM = S.MaDM
            GROUP BY DM.TenDM
            ORDER BY TotalStockQuantity DESC
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi lấy báo cáo tồn kho:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy báo cáo tồn kho.' });
    }
};