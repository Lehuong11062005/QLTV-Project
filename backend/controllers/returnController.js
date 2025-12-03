const sql = require("mssql");
const config = require("../db/dbConfig");
const { getUniqueId } = require("../utils/dbUtils");

// ============================================================
// 🔄 NGHIỆP VỤ TRẢ SÁCH & PHẠT (Dành cho Thủ thư/Admin)
// ============================================================

/**
 * @description Xử lý trả sách, tính phạt và TỰ ĐỘNG THU TIỀN (Cash)
 * @route POST /api/return
 */
exports.returnBook = async (req, res) => {
    let transaction;
    try {
        // 1. Dữ liệu từ Client
        const { maMuon, sachTra } = req.body; 
        const maTT = req.user.MaTT || req.user.UserId; 

        if (!maMuon || !sachTra || sachTra.length === 0) {
            return res.status(400).json({ message: "Thiếu thông tin trả sách." });
        }

        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 2. Tính tổng tiền phạt
        const tongTienPhat = sachTra.reduce((total, item) => {
            return total + (Number(item.tienPhat) || 0) + (Number(item.tienDenBu) || 0);
        }, 0);

        // 3. Tạo Phiếu Trả (TraSach)
        const maTra = await getUniqueId(transaction, "PT", "TraSach", "MaTra");
        
        await transaction.request()
            .input("MaTra", sql.VarChar(10), maTra)
            .input("MaMuon", sql.VarChar(10), maMuon)
            .input("MaTT", sql.VarChar(10), maTT)
            .input("TongTienPhat", sql.Decimal(18, 0), tongTienPhat)
            .query(`
                INSERT INTO TraSach (MaTra, MaMuon, MaTT_NhanTra, NgayTra, TongTienPhat)
                VALUES (@MaTra, @MaMuon, @MaTT, GETDATE(), @TongTienPhat)
            `);

        // =========================================================================
        // 🔥 ĐOẠN CODE MỚI: TỰ ĐỘNG GHI NHẬN THANH TOÁN TIỀN MẶT
        // =========================================================================
        if (tongTienPhat > 0) {
            // Tạo mã giao dịch ảo
            const maTT_ThanhToan = `CASH${Date.now().toString().slice(-6)}`; 
            const maGiaoDich = `FINE_${maTra}`; // Mã tham chiếu

            await transaction.request()
                .input("MaTT_ThanhToan", sql.VarChar(10), maTT_ThanhToan)
                .input("MaTra", sql.VarChar(10), maTra)
                .input("TongTienPhat", sql.Decimal(18, 0), tongTienPhat)
                .input("MaGiaoDich", sql.VarChar(100), maGiaoDich)
                .query(`
                    INSERT INTO ThanhToan (
                        MaTT, MaPhat, PhuongThuc, SoTien, 
                        TrangThai, MaGiaoDich, NgayThanhToan, LoaiGiaoDich
                    )
                    VALUES (
                        @MaTT_ThanhToan, 
                        @MaTra,       -- Link tới phiếu trả vừa tạo
                        N'TienMat',   -- Phương thức là Tiền Mặt (hoặc COD)
                        @TongTienPhat, 
                        N'HoanThanh', -- Mặc định là đã thu tiền xong
                        @MaGiaoDich, 
                        GETDATE(), 
                        'PhiPhat'     -- Đánh dấu đây là tiền phạt
                    )
                `);
            console.log(`✅ Đã thu tiền phạt tại quầy cho phiếu ${maTra}: ${tongTienPhat} VNĐ`);
        }
        // =========================================================================

        // 4. Xử lý chi tiết sách (TraSach_Sach & BanSao_ThuVien & Kho)
        for (const item of sachTra) {
            // a. Insert chi tiết trả
            await transaction.request()
                .input("MaTra", sql.VarChar(10), maTra)
                .input("MaBanSao", sql.VarChar(15), item.maBanSao)
                .input("TienPhat", sql.Decimal(18, 0), item.tienPhat || 0)
                .input("TienDenBu", sql.Decimal(18, 0), item.tienDenBu || 0)
                .input("LyDo", sql.NVarChar(255), item.lyDo || "")
                .query(`
                    INSERT INTO TraSach_Sach (MaTra, MaBanSao, TienPhatQuaHan, TienDenBu, LyDoPhat)
                    VALUES (@MaTra, @MaBanSao, @TienPhat, @TienDenBu, @LyDo)
                `);

            // b. Update trạng thái bản sao
            let trangThaiMoi = 'SanSang';
            if (item.isHuHong) trangThaiMoi = 'HuHong';
            if (item.isMatSach) trangThaiMoi = 'Mat'; // Thêm logic Mất sách nếu cần

            await transaction.request()
                .input("MaBanSao", sql.VarChar(15), item.maBanSao)
                .input("TrangThai", sql.NVarChar(50), trangThaiMoi)
                .query(`
                    UPDATE BanSao_ThuVien SET TrangThaiBanSao = @TrangThai WHERE MaBanSao = @MaBanSao
                `);

            // c. Update tồn kho sách gốc (Chỉ tăng lại nếu sách Sẵn Sàng)
            if (trangThaiMoi === 'SanSang') {
                const banSaoInfo = await transaction.request()
                    .input("MaBanSao", sql.VarChar(15), item.maBanSao)
                    .query("SELECT MaSach FROM BanSao_ThuVien WHERE MaBanSao = @MaBanSao");
                
                if (banSaoInfo.recordset.length > 0) {
                    const maSach = banSaoInfo.recordset[0].MaSach;
                    await transaction.request()
                        .input("MaSach", sql.VarChar(10), maSach)
                        .query("UPDATE Sach SET SoLuongTon = SoLuongTon + 1 WHERE MaSach = @MaSach");
                }
            }
        }

        // 5. Kiểm tra hoàn tất phiếu mượn
        const countBorrow = await transaction.request()
            .input("MaMuon", sql.VarChar(10), maMuon)
            .query("SELECT COUNT(*) as Total FROM MuonSach_Sach WHERE MaMuon = @MaMuon");
        
        const countReturn = await transaction.request()
            .input("MaMuon", sql.VarChar(10), maMuon)
            .query(`
                SELECT COUNT(*) as Returned FROM TraSach_Sach TSS
                JOIN TraSach TS ON TSS.MaTra = TS.MaTra
                WHERE TS.MaMuon = @MaMuon
            `);

        if (countReturn.recordset[0].Returned >= countBorrow.recordset[0].Total) {
            await transaction.request()
                .input("MaMuon", sql.VarChar(10), maMuon)
                .query("UPDATE MuonSach SET TrangThai = N'DaTraHet' WHERE MaMuon = @MaMuon");
        }

        await transaction.commit();

        res.status(200).json({
            code: 200,
            message: "Trả sách thành công! (Đã ghi nhận thu tiền phạt)",
            data: { maTra, tongTienPhat }
        });

    } catch (error) {
        if (transaction && transaction._aborted === false) await transaction.rollback();
        console.error("Lỗi trả sách:", error);
        res.status(500).json({ message: "Lỗi xử lý trả sách.", error: error.message });
    }
};
/**
 * @description Lấy danh sách lịch sử trả sách (Admin)
 * @route GET /api/return/history
 */
exports.getAllReturns = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT 
                TS.MaTra, TS.NgayTra, TS.TongTienPhat,
                MS.MaMuon, DG.HoTen AS DocGia, TT.HoTen AS ThuThuNhan
            FROM TraSach TS
            JOIN MuonSach MS ON TS.MaMuon = MS.MaMuon
            JOIN DocGia DG ON MS.MaDG = DG.MaDG
            LEFT JOIN ThuThu TT ON TS.MaTT_NhanTra = TT.MaTT
            ORDER BY TS.NgayTra DESC
        `);

        res.status(200).json({
            code: 200,
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy lịch sử trả:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

/**
 * @description Lấy chi tiết một phiếu trả cụ thể
 * @route GET /api/return/detail/:maTra
 */
exports.getReturnDetail = async (req, res) => {
    try {
        const { maTra } = req.params;
        const pool = await sql.connect(config);
        
        const result = await pool.request()
            .input("MaTra", sql.VarChar(10), maTra)
            .query(`
                SELECT 
                    TSS.MaBanSao, TSS.TienPhatQuaHan, TSS.TienDenBu, TSS.LyDoPhat,
                    S.TenSach, S.MaSach
                FROM TraSach_Sach TSS
                JOIN BanSao_ThuVien BS ON TSS.MaBanSao = BS.MaBanSao
                JOIN Sach S ON BS.MaSach = S.MaSach
                WHERE TSS.MaTra = @MaTra
            `);

        res.status(200).json({
            code: 200,
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy chi tiết trả:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

/**
 * @description Lấy danh sách các phiếu đang mượn (Đã duyệt & Quá hạn) để xử lý trả
 * @route GET /api/return/active
 */
exports.getActiveBorrows = async (req, res) => {
    try {
        const { keyword } = req.query; // Lấy từ khóa tìm kiếm từ frontend gửi lên
        const pool = await sql.connect(config);
        const request = pool.request();

        // Truy vấn lấy MaMuon, NgayMuon, HanTra, TrangThai và Tên Độc Giả
        // Chỉ lấy trạng thái 'DaDuyet' (đang mượn) hoặc 'QuaHan'
        let query = `
            SELECT 
                MS.MaMuon, MS.NgayMuon, MS.HanTra, MS.TrangThai,
                DG.HoTen, DG.MaDG
            FROM MuonSach MS
            JOIN DocGia DG ON MS.MaDG = DG.MaDG
            WHERE MS.TrangThai IN (N'DaDuyet', N'QuaHan')
        `;

        // Nếu có tìm kiếm, thêm điều kiện lọc
        if (keyword) {
            query += ` AND (MS.MaMuon LIKE @Keyword OR DG.HoTen LIKE @Keyword)`;
            request.input("Keyword", sql.NVarChar, `%${keyword}%`);
        }

        query += ` ORDER BY MS.HanTra ASC`; // Sắp xếp: Hết hạn trước hiện lên đầu

        const result = await request.query(query);

        res.status(200).json({
            code: 200,
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách đang mượn:", error);
        res.status(500).json({ message: "Lỗi server khi tải danh sách phiếu mượn." });
    }
};