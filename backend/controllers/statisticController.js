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
        
        // 1. Tổng quan người dùng (Bảng DocGia, ThuThu) - Khớp [cite: 5]
        const totalUsers = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM DocGia) AS TotalDocGia,
                (SELECT COUNT(*) FROM ThuThu) AS TotalThuThu
        `);
        
        // 2. Tổng quan sách (Bảng Sach, BanSao_ThuVien) - Khớp 
        const totalBooks = await pool.request().query(`
            SELECT 
                ISNULL(SUM(SoLuongTon), 0) AS TotalStock,
                COUNT(MaSach) AS TotalUniqueBooks,
                (SELECT COUNT(*) FROM BanSao_ThuVien WHERE TrangThaiBanSao = N'SanSang') AS AvailableCopies
            FROM Sach
        `);
        
        // 3. Thống kê Mượn/Trả (Bảng MuonSach, BanSao_ThuVien) - Khớp 
        const borrowReturnStats = await pool.request().query(`
            SELECT
                -- Tổng phiếu mượn
                (SELECT COUNT(*) FROM MuonSach) AS TotalBorrowOrders,

                -- Đơn chờ duyệt (Khớp trạng thái 'ChoDuyet' trong file )
                (SELECT COUNT(*) FROM MuonSach WHERE TrangThai = N'ChoDuyet') AS PendingBorrowOrders,
                
                -- Sách đang mượn (Khớp trạng thái 'DangMuon' trong file )
                (SELECT COUNT(*) FROM BanSao_ThuVien WHERE TrangThaiBanSao = 'DangMuon') AS CurrentlyBorrowed,
                
                -- Sách quá hạn (Khớp trạng thái 'QuaHan' trong file )
                (SELECT COUNT(MSS.MaBanSao) 
                 FROM MuonSach MS 
                 JOIN MuonSach_Sach MSS ON MS.MaMuon = MSS.MaMuon 
                 WHERE MS.TrangThai = N'QuaHan') AS OverdueBorrows
        `);
        
        // 4. Tổng Doanh thu (Bảng DonHang) - Khớp [cite: 9]
        const totalRevenue = await pool.request().query(`
            SELECT 
                ISNULL(SUM(TongTien), 0) AS TotalRevenue,
                COUNT(MaDH) AS TotalPurchaseOrders
            FROM DonHang 
            WHERE TrangThaiThanhToan = N'DaThanhToan' 
               OR TrangThai = N'HoanThanh'
        `);

        // 5. ⭐️ MỚI: Thống kê Phản hồi từ bảng PhanHoi 
        const feedbackStats = await pool.request().query(`
             SELECT COUNT(*) AS PendingFeedback 
             FROM PhanHoi 
             WHERE TrangThai = N'Chưa xử lý'
        `);
        
        // Trả về JSON
        res.json({
            users: totalUsers.recordset[0],
            books: {
                TotalStock: totalBooks.recordset[0].TotalStock,
                TotalUniqueBooks: totalBooks.recordset[0].TotalUniqueBooks,
                AvailableStock: totalBooks.recordset[0].AvailableCopies
            },
            borrowing: borrowReturnStats.recordset[0],
            revenue: totalRevenue.recordset[0],
            
            // ⭐️ Dữ liệu phản hồi thật
            feedback: feedbackStats.recordset[0] 
        });

    } catch (err) {
        console.error('Lỗi lấy dữ liệu Dashboard:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu tổng quan.' });
    }
};

// ============================================================
// B. BÁO CÁO CHI TIẾT
// ============================================================

// GET /api/stats/report/top-borrowed
exports.getTopBorrowedBooks = async (req, res) => {
    const top = 10; 
    try {
        const pool = await sql.connect(config); // Sửa kết nối
        
        const result = await pool.request()
            .input('topN', sql.Int, top)
            .query(`
                SELECT TOP (@topN)
                    S.MaSach,
                    S.TenSach,
                    S.AnhMinhHoa,
                    COUNT(MSS.MaBanSao) AS TotalBorrowTimes
                FROM MuonSach_Sach MSS
                JOIN BanSao_ThuVien BS ON MSS.MaBanSao = BS.MaBanSao
                JOIN Sach S ON BS.MaSach = S.MaSach
                GROUP BY S.MaSach, S.TenSach, S.AnhMinhHoa
                ORDER BY TotalBorrowTimes DESC
            `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi lấy báo cáo sách hot:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy báo cáo sách.' });
    }
};

// GET /api/stats/report/revenue-by-month
exports.getMonthlyRevenue = async (req, res) => {
    const currentYear = new Date().getFullYear(); 
    try {
        const pool = await sql.connect(config); // Sửa kết nối
        const result = await pool.request()
            .input('CurrentYear', sql.Int, currentYear)
            .query(`
                SELECT
                    MONTH(NgayTao) AS Month,
                    ISNULL(SUM(TongTien), 0) AS TotalRevenue
                FROM DonHang
                WHERE YEAR(NgayTao) = @CurrentYear
                AND (TrangThai = N'HoanThanh' OR TrangThaiThanhToan = N'DaThanhToan')
                GROUP BY MONTH(NgayTao)
                ORDER BY Month
            `);
            
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({ 
            name: `Tháng ${i + 1}`, 
            revenue: 0 
        }));
        
        result.recordset.forEach(row => {
            if (row.Month >= 1 && row.Month <= 12) {
                monthlyData[row.Month - 1].revenue = row.TotalRevenue;
            }
        });

        res.json({ year: currentYear, data: monthlyData });
    } catch (err) {
        console.error('Lỗi lấy báo cáo doanh thu:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy báo cáo doanh thu.' });
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