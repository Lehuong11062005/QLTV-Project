// src/controllers/borrowController.js
const sql = require("mssql");
const config = require("../db/dbConfig");
const { getUniqueId } = require("../utils/dbUtils");

// ---------------------------
// 👥 CHỨC NĂNG ĐỘC GIẢ
// ---------------------------

/** Tạo Phiếu Mượn từ Giỏ Mượn */
exports.createBorrowOrder = async (req, res) => {
    let transaction;
    try {
        const { ghiChu, hanTraDuKien } = req.body;
        const maDG = req.user.MaDG;

        if (!maDG) return res.status(401).json({ message: 'Không xác định được người dùng.' });

        // 1. Kết nối Pool & Khởi tạo Transaction chuẩn
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        
        await transaction.begin();

        // ---------------------------------------------------------
        // BƯỚC A: LẤY DỮ LIỆU GIỎ MƯỢN
        // ---------------------------------------------------------
        const gioResult = await transaction.request().query`SELECT MaGM FROM GioMuon WHERE MaDG = ${maDG}`;
        
        if (!gioResult.recordset.length) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Giỏ mượn không tồn tại.' });
        }
        const maGM = gioResult.recordset[0].MaGM;

        const cartItems = await transaction.request().query`
            SELECT ghs.MaSach, ghs.SoLuong, s.TenSach 
            FROM GioMuon_Sach ghs
            JOIN Sach s ON ghs.MaSach = s.MaSach
            WHERE ghs.MaGM = ${maGM}
        `;

        if (!cartItems.recordset.length) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Giỏ mượn trống.' });
        }

        // ---------------------------------------------------------
        // BƯỚC B: TẠO PHIẾU MƯỢN (MASTER)
        // ---------------------------------------------------------
        const maMuon = await getUniqueId(transaction, "PM", "MuonSach", "MaMuon");
        
        const ngayMuon = new Date();
        const hanTra = hanTraDuKien ? new Date(hanTraDuKien) : new Date(ngayMuon.getTime() + (14 * 24 * 60 * 60 * 1000));

        await transaction.request().query`
            INSERT INTO MuonSach (MaMuon, MaDG, NgayMuon, HanTra, TrangThai)
            VALUES (${maMuon}, ${maDG}, GETDATE(), ${hanTra}, N'ChoDuyet')
        `;

        // ---------------------------------------------------------
        // BƯỚC C: XỬ LÝ CHI TIẾT & GÁN BẢN SAO
        // ---------------------------------------------------------
        for (const item of cartItems.recordset) {
            // 1. Tìm bản sao "SanSang"
            const banSaoResult = await transaction.request().query`
                SELECT TOP (${item.SoLuong}) MaBanSao 
                FROM BanSao_ThuVien 
                WHERE MaSach = ${item.MaSach} AND TrangThaiBanSao = 'SanSang'
            `;

            if (banSaoResult.recordset.length < item.SoLuong) {
                await transaction.rollback();
                return res.status(400).json({ 
                    message: `Sách "${item.TenSach}" không đủ bản sao sẵn sàng (Cần: ${item.SoLuong}, Có: ${banSaoResult.recordset.length}).` 
                });
            }

            // 2. Gán bản sao vào phiếu
            for (const banSao of banSaoResult.recordset) {
                await transaction.request().query`
                    INSERT INTO MuonSach_Sach (MaMuon, MaBanSao)
                    VALUES (${maMuon}, ${banSao.MaBanSao})
                `;

                await transaction.request().query`
                    UPDATE BanSao_ThuVien 
                    SET TrangThaiBanSao = 'DangMuon' 
                    WHERE MaBanSao = ${banSao.MaBanSao}
                `;
            }

            // 3. Trừ tồn kho tổng
            await transaction.request().query`
                UPDATE Sach SET SoLuongTon = SoLuongTon - ${item.SoLuong} WHERE MaSach = ${item.MaSach}
            `;
        }

        // ---------------------------------------------------------
        // BƯỚC D: DỌN DẸP GIỎ MƯỢN
        // ---------------------------------------------------------
        await transaction.request().query`DELETE FROM GioMuon_Sach WHERE MaGM = ${maGM}`;
        await transaction.request().query`UPDATE GioMuon SET TongSoLuong = 0 WHERE MaGM = ${maGM}`;

        await transaction.commit();
        res.status(200).json({ code: 200, message: 'Gửi yêu cầu mượn sách thành công!', maMuon });

    } catch (error) {
        if (transaction && transaction._aborted === false) {
            try { await transaction.rollback(); } catch (e) {}
        }
        console.error('❌ Lỗi tạo phiếu mượn:', error);
        res.status(500).json({ code: 500, message: 'Lỗi tạo phiếu mượn: ' + error.message });
    }
};

/** Lấy lịch sử phiếu mượn */
exports.getBorrowHistory = async (req, res) => {
    try {
        const maDG = req.user.MaDG;
        const { status } = req.query;

        const pool = await sql.connect(config);
        const request = pool.request().input("MaDG", sql.VarChar(10), maDG);

        let query = `
            SELECT 
                MS.MaMuon, 
                MS.NgayMuon, 
                MS.HanTra, 
                MS.TrangThai,
                COUNT(MSS.MaBanSao) AS TongSoSach 
            FROM MuonSach MS
            LEFT JOIN MuonSach_Sach MSS ON MS.MaMuon = MSS.MaMuon
            WHERE MS.MaDG = @MaDG
        `;

        if (status) {
            query += " AND MS.TrangThai = @Status";
            request.input("Status", sql.NVarChar(50), status);
        }

        query += " GROUP BY MS.MaMuon, MS.NgayMuon, MS.HanTra, MS.TrangThai";
        query += " ORDER BY MS.NgayMuon DESC";

        const result = await request.query(query);

        res.status(200).json({
            code: 200,
            data: result.recordset.map(record => ({
                maMuon: record.MaMuon,
                ngayMuon: record.NgayMuon,
                hanTra: record.HanTra,
                trangThai: record.TrangThai,
                tongSoSach: record.TongSoSach
            }))
        });
    } catch (error) {
        console.error("Error getting borrow history:", error);
        res.status(500).json({ code: 500, message: "Lỗi khi lấy lịch sử mượn sách" });
    }
};

/** Lấy chi tiết 1 phiếu mượn */
exports.getBorrowDetail = async (req, res) => {
    try {
        const { maMuon } = req.params;
        const maDG = req.user.MaDG; 
        
        const pool = await sql.connect(config);
        const request = pool.request()
            .input("MaMuon", sql.VarChar(10), maMuon) 
            .input("MaDG", sql.VarChar(10), maDG);

        const query = `
            SELECT 
                M.MaMuon, M.NgayMuon, M.HanTra, M.TrangThai, M.MaTT_ChoMuon,
                BS.MaBanSao, BS.ViTriKe, BS.TrangThaiBanSao,
                S.MaSach, S.TenSach, S.AnhMinhHoa
            FROM MuonSach M
            LEFT JOIN MuonSach_Sach MSS ON M.MaMuon = MSS.MaMuon
            LEFT JOIN BanSao_ThuVien BS ON MSS.MaBanSao = BS.MaBanSao
            LEFT JOIN Sach S ON BS.MaSach = S.MaSach
            WHERE M.MaMuon = @MaMuon AND M.MaDG = @MaDG
        `;
        
        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ code: 404, message: "Không tìm thấy phiếu mượn hoặc bạn không có quyền truy cập." });
        }
        
        res.status(200).json({ code: 200, data: result.recordset });
    } catch (error) {
        console.error("Error getting borrow detail:", error);
        res.status(500).json({ code: 500, message: "Lỗi máy chủ khi lấy chi tiết phiếu mượn." });
    }
};

// ---------------------------
// 🔑 CHỨC NĂNG ADMIN
// ---------------------------

// Lấy tất cả phiếu mượn
exports.getAllBorrowOrders = async (req, res) => {
    try {
        // Lấy tham số từ Frontend gửi lên (khớp với returnService.js)
        const { status, search } = req.query; 
        
        const pool = await sql.connect(config);
        const request = pool.request();

        let query = `
            SELECT M.*, DG.HoTen, DG.MaDG 
            FROM MuonSach M 
            JOIN DocGia DG ON M.MaDG = DG.MaDG
            WHERE 1=1 
        `;

        // 1. Xử lý Logic lọc trạng thái
        if (status) {
            if (status === 'active') {
                // Logic: Active = Đang mượn (DaDuyet) HOẶC Quá hạn (QuaHan)
                query += " AND M.TrangThai IN (N'DaDuyet', N'QuaHan')";
            } else {
                // Logic cũ: Tìm chính xác (ví dụ: ChoDuyet)
                query += " AND M.TrangThai = @Status";
                request.input("Status", sql.NVarChar, status);
            }
        }

        // 2. Xử lý Logic tìm kiếm (Search)
        if (search) {
            query += " AND (M.MaMuon LIKE @Search OR DG.HoTen LIKE @Search)";
            request.input("Search", sql.NVarChar, `%${search}%`);
        }

        // Sắp xếp: Ưu tiên phiếu sắp hết hạn lên đầu nếu đang xem Active, ngược lại giảm dần theo ngày mượn
        if (status === 'active') {
            query += " ORDER BY M.HanTra ASC"; 
        } else {
            query += " ORDER BY M.NgayMuon DESC";
        }

        const result = await request.query(query);

        res.status(200).json({ 
            code: 200, 
            data: result.recordset 
        });
    } catch (error) {
        console.error("Error getting orders:", error);
        res.status(500).json({ code: 500, message: "Lỗi khi lấy danh sách phiếu mượn" });
    }
};

// Lấy chi tiết phiếu mượn (Admin)
exports.getBorrowOrderDetails = async (req, res) => {
    try {
        const { maMuon } = req.params;
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input("MaMuon", sql.VarChar, maMuon)
            .query(`
                SELECT 
                    M.*, 
                    DG.HoTen AS DocGiaHoTen,
                    MSS.MaBanSao, 
                    S.TenSach,
                    BS.TrangThaiBanSao  -- <--- THÊM DÒNG NÀY ĐỂ FRONTEND LỌC ĐƯỢC
                FROM MuonSach M
                JOIN DocGia DG ON M.MaDG = DG.MaDG
                LEFT JOIN MuonSach_Sach MSS ON M.MaMuon = MSS.MaMuon
                LEFT JOIN BanSao_ThuVien BS ON MSS.MaBanSao = BS.MaBanSao
                LEFT JOIN Sach S ON BS.MaSach = S.MaSach
                WHERE M.MaMuon = @MaMuon
            `);

        res.status(200).json({ code: 200, data: result.recordset });
    } catch (error) {
        console.error("Error getting order details:", error);
        res.status(500).json({ code: 500, message: "Lỗi khi lấy chi tiết phiếu mượn" });
    }
};

// Duyệt phiếu mượn
exports.approveBorrowOrder = async (req, res) => {
    const { maMuon } = req.params;

    // 1. Lấy MaTT từ Token (Hỗ trợ mọi case)
    const maTT = req.user?.UserId || req.user?.userId || req.user?.MaTT || req.user?.maTT;

    console.log("------------------------------------------------");
    console.log("🔍 APPROVE REQUEST:");
    console.log("🎫 Phiếu:", maMuon);
    console.log("👤 Người duyệt:", maTT);
    console.log("------------------------------------------------");

    if (!maMuon || maMuon === 'undefined') {
        return res.status(400).json({ message: 'Lỗi: Mã phiếu mượn không hợp lệ.' });
    }

    if (!maTT) {
        return res.status(401).json({ message: 'Không tìm thấy mã Thủ thư trong Token.' });
    }

    if (maTT.length > 20) {
        return res.status(400).json({ message: `Mã thủ thư quá dài: ${maTT}` });
    }

    let transaction;
    try {
        // FIX QUAN TRỌNG: Kết nối pool trước khi tạo Transaction
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        
        await transaction.begin();
        const request = new sql.Request(transaction);

        // 2. Cập nhật phiếu mượn
        request.input('MaMuon', sql.VarChar, maMuon);
        request.input('MaTT', sql.VarChar, maTT);
        
        const updatePhieuResult = await request.query(`
            UPDATE MuonSach 
            SET 
                TrangThai = N'DaDuyet', 
                MaTT_ChoMuon = @MaTT,
                NgayMuon = GETDATE(),
                HanTra = DATEADD(DAY, 14, GETDATE())
            WHERE MaMuon = @MaMuon AND TrangThai = N'ChoDuyet'
        `);

        if (updatePhieuResult.rowsAffected[0] === 0) {
            throw new Error('Không tìm thấy phiếu mượn hoặc phiếu không ở trạng thái Chờ Duyệt.');
        }

        // 3. Cập nhật trạng thái sách trong kho
        await request.query(`
            UPDATE BanSao_ThuVien
            SET TrangThaiBanSao = 'DangMuon'
            WHERE MaBanSao IN (
                SELECT MaBanSao 
                FROM MuonSach_Sach 
                WHERE MaMuon = @MaMuon
            )
        `);

        await transaction.commit();

        console.log("✅ Duyệt thành công!");
        res.json({ 
            code: 200,
            message: `Duyệt thành công phiếu ${maMuon}`,
            nguoiDuyet: maTT
        });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('❌ Lỗi duyệt phiếu:', err);
        res.status(500).json({ message: err.message || 'Lỗi server.' });
    }
};

// Từ chối phiếu mượn
exports.rejectBorrowOrder = async (req, res) => {
    let transaction;
    try {
        const { maMuon } = req.params;
        // const { lyDoTuChoi } = req.body; 

        // Kết nối pool và tạo transaction
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        // Dùng request từ transaction
        const request = new sql.Request(transaction);

        // 1. Kiểm tra phiếu
        const checkOrder = await request
            .input("MaMuon", sql.VarChar, maMuon)
            .query("SELECT TrangThai FROM MuonSach WHERE MaMuon = @MaMuon");

        if (checkOrder.recordset.length === 0 || checkOrder.recordset[0].TrangThai !== 'ChoDuyet') {
            await transaction.rollback();
            return res.status(400).json({ message: "Phiếu mượn không tồn tại hoặc không ở trạng thái chờ duyệt." });
        }

        // 2. Lấy danh sách sách để hoàn kho
        // Cần tạo request mới để clear params cũ hoặc define lại param nếu cần
        const itemsRequest = new sql.Request(transaction);
        const items = await itemsRequest
            .input("MaMuon", sql.VarChar, maMuon)
            .query(`
                SELECT MSS.MaBanSao, BS.MaSach 
                FROM MuonSach_Sach MSS
                JOIN BanSao_ThuVien BS ON MSS.MaBanSao = BS.MaBanSao
                WHERE MSS.MaMuon = @MaMuon
            `);

        // 3. Hoàn tác: Trả lại kho
        for (const item of items.recordset) {
            const itemReq = new sql.Request(transaction);
            await itemReq
                .input("MaBanSao", sql.VarChar, item.MaBanSao)
                .query("UPDATE BanSao_ThuVien SET TrangThaiBanSao = 'SanSang' WHERE MaBanSao = @MaBanSao");

            const stockReq = new sql.Request(transaction);
            await stockReq
                .input("MaSach", sql.VarChar, item.MaSach)
                .query("UPDATE Sach SET SoLuongTon = SoLuongTon + 1 WHERE MaSach = @MaSach");
        }

        // 4. Cập nhật trạng thái phiếu thành DaHuy
        const updateReq = new sql.Request(transaction);
        await updateReq
            .input("MaMuon", sql.VarChar, maMuon)
            .query("UPDATE MuonSach SET TrangThai = N'DaHuy' WHERE MaMuon = @MaMuon");

        await transaction.commit();
        
        res.status(200).json({ 
            code: 200, 
            message: "Đã từ chối phiếu mượn và hoàn kho thành công.", 
            maMuon 
        });

    } catch (error) {
        if (transaction && transaction._aborted === false) await transaction.rollback();
        console.error("Error rejecting:", error);
        res.status(500).json({ code: 500, message: error.message });
    }
};

// Cập nhật trạng thái phiếu mượn
exports.updateBorrowStatus = async (req, res) => {
    try {
        const { maMuon } = req.params;
        const { trangThaiMoi } = req.body;

        const pool = await sql.connect(config);
        await pool.request()
            .input("MaMuon", sql.VarChar, maMuon)
            .input("TrangThaiMoi", sql.NVarChar, trangThaiMoi)
            .query(`
                UPDATE MuonSach SET TrangThai = @TrangThaiMoi
                WHERE MaMuon = @MaMuon
            `);

        res.status(200).json({ code: 200, maMuon, trangThaiMoi });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ code: 500, message: error.message });
    }
};