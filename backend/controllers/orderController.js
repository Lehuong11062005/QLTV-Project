const sql = require("mssql");
const config = require("../db/dbConfig");
const { getUniqueId } = require("../utils/dbUtils");

// Hàm tiện ích để lấy request từ transaction hoặc pool
const getRequest = (context) => context.request();

// ---------------------------
// 👥 CHỨC NĂNG ĐỘC GIẢ
// ---------------------------

/** Tạo đơn hàng từ giỏ mua (Checkout) */
exports.createOrder = async (req, res) => {
    // 1. Lấy dữ liệu cần thiết
    const MaDG = req.user.MaDG || req.user.UserId; // Hỗ trợ cả 2 trường hợp token
    const { diaChiGiaoHang, phuongThucThanhToan, phiVanChuyen } = req.body;
    
    let transaction; 

    try {
        // --- 1. THIẾT LẬP KẾT NỐI VÀ LẤY DỮ LIỆU GIỎ HÀNG ---
        const pool = await sql.connect(config); 
        
        // Lấy MaGH, TamTinh và chi tiết sách từ GioHang
        const requestToGetCart = getRequest(pool); 
        await requestToGetCart.input('MaDG', sql.VarChar(10), MaDG);
        
        const cartResult = await requestToGetCart.query(`
            SELECT MaGH, TamTinh 
            FROM GioHang 
            WHERE MaDG = @MaDG
        `);

        if (cartResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giỏ hàng cho độc giả này.' });
        }
        const { MaGH, TamTinh } = cartResult.recordset[0];

        const cartItemsResult = await requestToGetCart.query(`
            SELECT gh.MaSach, gh.SoLuong, s.GiaBan 
            FROM GioHang_Sach gh
            JOIN Sach s ON gh.MaSach = s.MaSach
            WHERE gh.MaGH = '${MaGH}'
        `);
        const items = cartItemsResult.recordset;
        if (items.length === 0) {
            return res.status(400).json({ message: 'Giỏ hàng rỗng, không thể tạo đơn hàng.' });
        }

        // --- 2. BẮT ĐẦU TRANSACTION VÀ TẠO ĐƠN HÀNG ---
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Sinh Mã Đơn Hàng (MaDH)
        const MaDH = await getUniqueId(transaction, 'DH', 'DonHang', 'MaDH');
        
        const NgayTao = new Date();
        const TongTien = parseFloat(TamTinh) + parseFloat(phiVanChuyen || 0);
        
        const TrangThai = 'ChoDuyet'; 
        const TrangThaiThanhToan = 'ChuaThanhToan'; // Mặc định chưa thanh toán

        // Insert vào DonHang
        const insertOrderRequest = getRequest(transaction); 
        insertOrderRequest.input('MaDH', sql.VarChar(10), MaDH);
        insertOrderRequest.input('MaDG', sql.VarChar(10), MaDG);
        insertOrderRequest.input('NgayTao', sql.DateTime, NgayTao);
        insertOrderRequest.input('TongTien', sql.Decimal(18, 0), TongTien);
        insertOrderRequest.input('DiaChiGiaoHang', sql.NVarChar(255), diaChiGiaoHang);
        insertOrderRequest.input('TrangThai', sql.NVarChar(50), TrangThai);
        insertOrderRequest.input('HinhThucThanhToan', sql.NVarChar(50), phuongThucThanhToan);
        insertOrderRequest.input('TrangThaiThanhToan', sql.NVarChar(50), TrangThaiThanhToan);
        insertOrderRequest.input('PhiVanChuyen', sql.Decimal(18, 0), phiVanChuyen || 0);

        const insertOrderQuery = `
            INSERT INTO DonHang (MaDH, MaDG, NgayTao, TongTien, DiaChiGiaoHang, TrangThai, HinhThucThanhToan, TrangThaiThanhToan, PhiVanChuyen)
            VALUES (@MaDH, @MaDG, @NgayTao, @TongTien, @DiaChiGiaoHang, @TrangThai, @HinhThucThanhToan, @TrangThaiThanhToan, @PhiVanChuyen)
        `;
        await insertOrderRequest.query(insertOrderQuery);

        // --- 3. XỬ LÝ CHI TIẾT ĐƠN HÀNG VÀ TỒN KHO ---
        for (const item of items) {
            const detailRequest = getRequest(transaction); 

            detailRequest.input('MaDH', sql.VarChar(10), MaDH);
            detailRequest.input('MaSach', sql.VarChar(10), item.MaSach);
            detailRequest.input('SoLuong', sql.Int, item.SoLuong);
            detailRequest.input('DonGia', sql.Decimal(18, 0), item.GiaBan);

            const insertOrderDetailQuery = `
                INSERT INTO DonHang_Sach (MaDH, MaSach, SoLuong, DonGia)
                VALUES (@MaDH, @MaSach, @SoLuong, @DonGia)
            `;
            await detailRequest.query(insertOrderDetailQuery);

            // Giảm số lượng tồn kho (SoLuongTon)
            await detailRequest.query(`
                UPDATE Sach 
                SET SoLuongTon = SoLuongTon - @SoLuong 
                WHERE MaSach = @MaSach
            `);
        }

        // --- 4. XÓA GIỎ HÀNG VÀ COMMIT ---
        const deleteCartRequest = getRequest(transaction); 
        await deleteCartRequest.query(`
            DELETE FROM GioHang_Sach 
            WHERE MaGH = '${MaGH}'
        `);
        // Cập nhật lại tổng tiền giỏ hàng về 0
         await deleteCartRequest.query(`
            UPDATE GioHang SET TamTinh = 0 WHERE MaGH = '${MaGH}'
        `);

        await transaction.commit();

        res.status(201).json({ 
            code: 200,
            message: 'Đơn hàng được tạo thành công!', 
            MaDH, 
            TongTien,
            DiaChiGiaoHang: diaChiGiaoHang,
            PhuongThucThanhToan: phuongThucThanhToan
        });

    } catch (error) {
        // --- 5. ROLLBACK NẾU CÓ LỖI ---
        if (transaction) {
            try {
                if (transaction._aborted === false) await transaction.rollback();
            } catch (rollbackError) {
                console.error('Lỗi khi rollback transaction:', rollbackError);
            }
        }
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Lỗi máy chủ khi tạo đơn hàng.', error: error.message });
    }
};

/** Lấy lịch sử đơn hàng */
exports.getOrders = async (req, res) => {
    try {
        // ✅ FIX: Dùng MaDG chuẩn từ token
        const maDG = req.user.MaDG || req.user.UserId; 
        const { status } = req.query;

        const pool = await sql.connect(config);
        const request = pool.request().input("MaDG", sql.VarChar, maDG);

        // ✅ FIX: Thêm HinhThucThanhToan và dùng Alias AS camelCase
        let query = `
            SELECT 
                MaDH as maDH, 
                NgayTao as ngayTao, 
                TongTien as tongTien, 
                TrangThai as trangThai,
                HinhThucThanhToan as phuongThucThanhToan
            FROM DonHang 
            WHERE MaDG = @MaDG
        `;

        if (status) {
            query += ` AND TrangThai = @Status`;
            request.input("Status", sql.NVarChar, status);
        }

        query += " ORDER BY NgayTao DESC";

        const result = await request.query(query);

        res.status(200).json({
            code: 200,
            data: result.recordset
        });
    } catch (error) {
        console.error("Error getting user orders:", error);
        res.status(500).json({ code: 500, message: "Lỗi lấy lịch sử đơn hàng" });
    }
};

/** Lấy chi tiết 1 đơn hàng (User View) */
exports.getOrderDetail = async (req, res) => {
    try {
        const { MaDH } = req.params;
        const maDG = req.user.MaDG || req.user.UserId; // ✅ FIX

        const pool = await sql.connect(config);
        
        // ✅ FIX: Thêm AnhMinhHoa để trang chi tiết hiển thị đẹp hơn
        const result = await pool.request()
            .input("MaDH", sql.VarChar, MaDH)
            .input("MaDG", sql.VarChar, maDG)
            .query(`
                SELECT 
                    DH.MaDH, DH.NgayTao, DH.TrangThai, DH.TongTien, 
                    DH.DiaChiGiaoHang, DH.HinhThucThanhToan, DH.PhiVanChuyen,
                    DHS.MaSach, S.TenSach, S.AnhMinhHoa, 
                    DHS.SoLuong, DHS.DonGia AS GiaLucDat
                FROM DonHang DH
                JOIN DonHang_Sach DHS ON DH.MaDH = DHS.MaDH
                JOIN Sach S ON DHS.MaSach = S.MaSach
                WHERE DH.MaDH = @MaDH AND DH.MaDG = @MaDG
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ code: 404, message: "Không tìm thấy đơn hàng." });
        }

        res.status(200).json({
            code: 200,
            data: result.recordset
        });
    } catch (error) {
        console.error("Error getting order detail:", error);
        res.status(500).json({ code: 500, message: "Lỗi lấy chi tiết đơn hàng" });
    }
};

// ---------------------------
// 🔑 CHỨC NĂNG ADMIN
// ---------------------------

// 1. Lấy tất cả đơn hàng (Admin List)
exports.getAllOrdersAdmin = async (req, res) => {
    try {
        const { status } = req.query;

        const pool = await sql.connect(config);
        const request = pool.request();

        let query = `
            SELECT DH.*, DG.HoTen AS TenNguoiMua
            FROM DonHang DH
            JOIN DocGia DG ON DH.MaDG = DG.MaDG
        `;

        if (status) {
            query += " WHERE DH.TrangThai = @Status";
            request.input("Status", sql.NVarChar, status);
        }
        
        query += " ORDER BY DH.NgayTao DESC";

        const result = await request.query(query);

        res.status(200).json({ code: 200, data: result.recordset });
    } catch (error) {
        console.error("Error getting all orders admin:", error);
        res.status(500).json({
            code: 500,
            message: "Lỗi khi lấy danh sách đơn hàng"
        });
    }
};

// 2. Lấy chi tiết đơn hàng (Admin View - Xem của bất kỳ ai)
// 🔥 BỔ SUNG HÀM NÀY ĐỂ CHẠY TRANG ADMIN PURCHASE
exports.getOrderDetailAdmin = async (req, res) => {
    try {
        const { MaDH } = req.params;
        const pool = await sql.connect(config);

        const result = await pool.request()
            .input("MaDH", sql.VarChar, MaDH)
            .query(`
                SELECT 
                    DH.MaDH, DH.NgayTao, DH.TrangThai, DH.TongTien, 
                    DH.DiaChiGiaoHang, DH.HinhThucThanhToan, DH.PhiVanChuyen, DH.MaVanDon,
                    DG.HoTen AS NguoiMua, DG.SDT, DG.Email,
                    DHS.MaSach, S.TenSach, S.AnhMinhHoa, 
                    DHS.SoLuong, DHS.DonGia AS GiaLucDat
                FROM DonHang DH
                JOIN DocGia DG ON DH.MaDG = DG.MaDG
                JOIN DonHang_Sach DHS ON DH.MaDH = DHS.MaDH
                JOIN Sach S ON DHS.MaSach = S.MaSach
                WHERE DH.MaDH = @MaDH
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
        }
        res.status(200).json({ code: 200, data: result.recordset });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi lấy chi tiết đơn hàng (Admin)" });
    }
};

// 3. Cập nhật trạng thái đơn hàng
exports.updateOrderStatus = async (req, res) => {
    try {
        const { MaDH } = req.params;
        const { trangThaiMoi, maVanDon } = req.body;

        if (!trangThaiMoi) {
            return res.status(400).json({
                code: 400,
                message: "Thiếu trạng thái mới."
            });
        }

        const pool = await sql.connect(config);
        const request = pool.request()
            .input("MaDH", sql.VarChar, MaDH)
            .input("TrangThaiMoi", sql.NVarChar, trangThaiMoi);

        let query = "UPDATE DonHang SET TrangThai = @TrangThaiMoi";

        if (maVanDon !== undefined) {
            query += ", MaVanDon = @MaVanDon";
            request.input("MaVanDon", sql.VarChar, maVanDon || null);
        }

        query += " WHERE MaDH = @MaDH";

        const result = await request.query(query);

        res.status(200).json({
            code: 200,
            maDonHang: MaDH,
            trangThaiMoi,
            message: "Cập nhật trạng thái đơn hàng thành công."
        });
    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({
            code: 500,
            message: error.message || "Lỗi khi cập nhật trạng thái đơn hàng"
        });
    }
};