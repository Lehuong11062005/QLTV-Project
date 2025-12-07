const sql = require("mssql");
const config = require("../db/dbConfig");
const { getUniqueId } = require("../utils/dbUtils");
const paymentController = require('./paymentController');
// Hàm tiện ích để lấy request từ transaction hoặc pool
const getRequest = (context) => context.request();

// ---------------------------
// 👥 CHỨC NĂNG ĐỘC GIẢ
// ---------------------------

/** Tạo đơn hàng từ giỏ mua (Checkout) */
exports.createOrder = async (req, res) => {
    // 1. Lấy dữ liệu cần thiết
    const MaDG = req.user.MaDG || req.user.UserId;
    const { diaChiGiaoHang, phuongThucThanhToan, phiVanChuyen } = req.body;
    
    let transaction; 

    try {
        // --- 1. THIẾT LẬP KẾT NỐI VÀ LẤY DỮ LIỆU GIỎ HÀNG ---
        const pool = await sql.connect(config); 
        
        // ... (Giữ nguyên đoạn lấy giỏ hàng của bạn) ...
        const requestToGetCart = getRequest(pool); 
        await requestToGetCart.input('MaDG', sql.VarChar(10), MaDG);
        
        const cartResult = await requestToGetCart.query(`
            SELECT MaGH, TamTinh FROM GioHang WHERE MaDG = @MaDG
        `);

        if (cartResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giỏ hàng.' });
        }
        const { MaGH, TamTinh } = cartResult.recordset[0];

        const cartItemsResult = await requestToGetCart.query(`
            SELECT gh.MaSach, gh.SoLuong, s.GiaBan 
            FROM GioHang_Sach gh JOIN Sach s ON gh.MaSach = s.MaSach
            WHERE gh.MaGH = '${MaGH}'
        `);
        const items = cartItemsResult.recordset;
        if (items.length === 0) {
            return res.status(400).json({ message: 'Giỏ hàng rỗng.' });
        }

        // --- 2. BẮT ĐẦU TRANSACTION VÀ TẠO ĐƠN HÀNG ---
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Sinh Mã Đơn Hàng
        const MaDH = await getUniqueId(transaction, 'DH', 'DonHang', 'MaDH');
        
        const NgayTao = new Date();
        const TongTien = parseFloat(TamTinh) + parseFloat(phiVanChuyen || 0);
        
        // Insert vào DonHang (Mặc định ChoDuyet, ChuaThanhToan)
        const insertOrderRequest = getRequest(transaction); 
        insertOrderRequest.input('MaDH', sql.VarChar(10), MaDH);
        insertOrderRequest.input('MaDG', sql.VarChar(10), MaDG);
        insertOrderRequest.input('NgayTao', sql.DateTime, NgayTao);
        insertOrderRequest.input('TongTien', sql.Decimal(18, 0), TongTien);
        insertOrderRequest.input('DiaChiGiaoHang', sql.NVarChar(255), diaChiGiaoHang);
        insertOrderRequest.input('TrangThai', sql.NVarChar(50), 'ChoDuyet');
        insertOrderRequest.input('HinhThucThanhToan', sql.NVarChar(50), phuongThucThanhToan);
        insertOrderRequest.input('TrangThaiThanhToan', sql.NVarChar(50), 'ChuaThanhToan');
        insertOrderRequest.input('PhiVanChuyen', sql.Decimal(18, 0), phiVanChuyen || 0);

        await insertOrderRequest.query(`
            INSERT INTO DonHang (MaDH, MaDG, NgayTao, TongTien, DiaChiGiaoHang, TrangThai, HinhThucThanhToan, TrangThaiThanhToan, PhiVanChuyen)
            VALUES (@MaDH, @MaDG, @NgayTao, @TongTien, @DiaChiGiaoHang, @TrangThai, @HinhThucThanhToan, @TrangThaiThanhToan, @PhiVanChuyen)
        `);

        // --- 3. XỬ LÝ CHI TIẾT ĐƠN HÀNG VÀ TỒN KHO ---
        for (const item of items) {
            const detailRequest = getRequest(transaction); 
            // ... (Giữ nguyên đoạn insert chi tiết và trừ kho) ...
            detailRequest.input('MaDH', sql.VarChar(10), MaDH);
            detailRequest.input('MaSach', sql.VarChar(10), item.MaSach);
            detailRequest.input('SoLuong', sql.Int, item.SoLuong);
            detailRequest.input('DonGia', sql.Decimal(18, 0), item.GiaBan);

            await detailRequest.query(`INSERT INTO DonHang_Sach (MaDH, MaSach, SoLuong, DonGia) VALUES (@MaDH, @MaSach, @SoLuong, @DonGia)`);
            await detailRequest.query(`UPDATE Sach SET SoLuongTon = SoLuongTon - @SoLuong WHERE MaSach = @MaSach`);
        }

        // =================================================================================
        // 🔥 BƯỚC 3.5: TẠO GIAO DỊCH THANH TOÁN (CHỈ VỚI ĐƠN ONLINE: BANK/MOMO)
        // =================================================================================
        
        const method = (phuongThucThanhToan || '').toLowerCase(); 

        // Kiểm tra nếu là Bank hoặc MoMo
        if (method === 'bank' || method === 'momo' || method.includes('chuyenkhoan')) {
            const transactionRequest = getRequest(transaction);

            // Sinh mã giao dịch
            const MaTT = 'TT' + Date.now().toString().slice(-8); 

            transactionRequest.input('MaTT', sql.VarChar(10), MaTT);
            transactionRequest.input('MaDH_Trans', sql.VarChar(10), MaDH);
            transactionRequest.input('PhuongThuc', sql.NVarChar(50), phuongThucThanhToan);
            transactionRequest.input('SoTien', sql.Decimal(18, 0), TongTien);
            
            // 🛠️ ĐÃ SỬA: Thay 'NgayTao' thành 'NgayThanhToan'
            await transactionRequest.query(`
                INSERT INTO ThanhToan (MaTT, MaDH, PhuongThuc, SoTien, TrangThai, LoaiGiaoDich, NoiDung, NgayThanhToan)
                VALUES (@MaTT, @MaDH_Trans, @PhuongThuc, @SoTien, N'ChoThanhToan', 'DonHang', N'Thanh toán đơn hàng Online', GETDATE())
            `);
            
            console.log(`✅ Đã tạo phiếu thanh toán chờ duyệt: ${MaTT} cho đơn ${MaDH}`);
        }
        // NẾU LÀ COD: Thì bỏ qua, không Insert vào bảng ThanhToan

        // =================================================================================

        // --- 4. XÓA GIỎ HÀNG VÀ COMMIT ---
        const deleteCartRequest = getRequest(transaction); 
        await deleteCartRequest.query(`DELETE FROM GioHang_Sach WHERE MaGH = '${MaGH}'`);
        await deleteCartRequest.query(`UPDATE GioHang SET TamTinh = 0 WHERE MaGH = '${MaGH}'`);

        await transaction.commit();

        res.status(201).json({ 
            code: 200,
            message: 'Đơn hàng được tạo thành công!', 
            MaDH, 
            TongTien,
            PhuongThucThanhToan: phuongThucThanhToan
        });

    } catch (error) {
        // --- 5. ROLLBACK NẾU CÓ LỖI ---
        if (transaction) {
            try {
                if (transaction._aborted === false) await transaction.rollback();
            } catch (rollbackError) {
                console.error('Lỗi rollback:', rollbackError);
            }
        }
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Lỗi máy chủ.', error: error.message });
    }
};

/** Lấy lịch sử đơn hàng */
exports.getOrders = async (req, res) => {
    try {
        const maDG = req.user.MaDG || req.user.UserId; 
        const { status } = req.query;

        const pool = await sql.connect(config);
        const request = pool.request().input("MaDG", sql.VarChar, maDG);

        // 🛠️ ĐÃ SỬA: Thêm dòng 'TrangThaiThanhToan as trangThaiThanhToan'
        let query = `
            SELECT 
                MaDH as maDH, 
                NgayTao as ngayTao, 
                TongTien as tongTien, 
                TrangThai as trangThai,
                HinhThucThanhToan as phuongThucThanhToan,
                TrangThaiThanhToan as trangThaiThanhToan  -- <--- BỔ SUNG DÒNG NÀY
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
                    
                    DH.TrangThaiThanhToan,  -- <--- 🔴 BỔ SUNG DÒNG QUAN TRỌNG NÀY VÀO
                    
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
    const { MaDH } = req.params;
    const { trangThaiMoi, maVanDon } = req.body;
    let transaction; 

    if (!trangThaiMoi) return res.status(400).json({ code: 400, message: "Thiếu trạng thái mới." });

    try {
        const pool = await sql.connect(config);
        
        // Bắt đầu Transaction
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // --- BƯỚC 1: CẬP NHẬT ĐƠN HÀNG ---
        // Chuẩn bị câu lệnh SQL động
        let query = "UPDATE DonHang SET TrangThai = @TrangThaiMoi";
        
        request.input("MaDH", sql.VarChar, MaDH);
        request.input("TrangThaiMoi", sql.NVarChar, trangThaiMoi);

        // Nếu hoàn thành -> Cập nhật luôn thanh toán
        if (trangThaiMoi === 'HoanThanh') {
            query += ", TrangThaiThanhToan = N'DaThanhToan'";
        }
        
        // Nếu có mã vận đơn (cho trạng thái Đang Giao)
        if (maVanDon !== undefined && maVanDon !== null && maVanDon !== "") {
            query += ", MaVanDon = @MaVanDon";
            request.input("MaVanDon", sql.VarChar, maVanDon);
        }

        query += " WHERE MaDH = @MaDH";

        await request.query(query);

        // --- BƯỚC 2: TỰ ĐỘNG TẠO GIAO DỊCH (NẾU LÀ COD/TIỀN MẶT) ---
        // Chỉ chạy khi trạng thái là Hoàn Thành
        if (trangThaiMoi === 'HoanThanh') {
            const orderRequest = new sql.Request(transaction);
            orderRequest.input("MaDH", sql.VarChar, MaDH);
            const orderInfo = await orderRequest.query("SELECT TongTien, HinhThucThanhToan FROM DonHang WHERE MaDH = @MaDH");
            
            if (orderInfo.recordset.length > 0) {
                const { TongTien, HinhThucThanhToan } = orderInfo.recordset[0];
                const method = (HinhThucThanhToan || '').toLowerCase();

                if (method === 'cod' || method.includes('tienmat') || method.includes('tiền mặt')) {
                    
                    // 🔴 SỬA TẠI ĐÂY: Đổi slice(-8) thành slice(-7)
                    // Kết quả: COD + 7 số = 10 ký tự (Vừa với VARCHAR(10) trong DB)
                    const maTT = 'COD' + Date.now().toString().slice(-7); 
                    
                    const maGiaoDich = 'CASH_' + MaDH;

                    const payRequest = new sql.Request(transaction);
                    payRequest.input('MaTT', sql.VarChar, maTT)
                              .input('MaDH', sql.VarChar, MaDH)
                              .input('SoTien', sql.Decimal, TongTien)
                              .input('MaGiaoDich', sql.VarChar, maGiaoDich);
                    // Kiểm tra xem đã có chưa
                    const check = await payRequest.query("SELECT MaTT FROM ThanhToan WHERE MaDH = @MaDH AND TrangThai = N'HoanThanh'");
                    
                    if (check.recordset.length === 0) {
                        await payRequest.query(`
                            INSERT INTO ThanhToan (MaTT, MaDH, PhuongThuc, SoTien, TrangThai, MaGiaoDich, NgayThanhToan, LoaiGiaoDich)
                            VALUES (@MaTT, @MaDH, 'COD', @SoTien, N'HoanThanh', @MaGiaoDich, GETDATE(), 'DonHang')
                        `);
                    }
                }
            }
        }

        // Commit thay đổi
        await transaction.commit();

        res.status(200).json({
            code: 200,
            maDonHang: MaDH,
            trangThaiMoi,
            message: "Cập nhật thành công!"
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Lỗi updateOrderStatus:", error); // Xem lỗi cụ thể ở Terminal backend
        res.status(500).json({
            code: 500,
            message: error.message || "Lỗi giao dịch cơ sở dữ liệu"
        });
    }
};