const sql = require('mssql');
const config = require('../db/dbConfig');
const axios = require('axios');
const crypto = require('crypto');

// ============================================================
// CẤU HÌNH MÔI TRƯỜNG (ENVIRONMENT VARIABLES)
// ============================================================
// Lấy từ file .env hoặc biến môi trường trên Server (Render)
const PARTNER_CODE = process.env.MOMO_PARTNER_CODE || "MOMO";
const ACCESS_KEY = process.env.MOMO_ACCESS_KEY || "F8BBA842ECF85"; // Key test mặc định
const SECRET_KEY = process.env.MOMO_SECRET_KEY || "K951B6PE1waDMi640xX08PD3vg6EkVlz"; // Key test mặc định

// ⚠️ QUAN TRỌNG: Cấu hình Domain
// BACKEND_URL: Link server API của bạn (VD: https://api-thuvien.onrender.com)
// FRONTEND_URL: Link trang web giao diện (VD: https://web-thuvien.vercel.app)
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const MOMO_CONFIG = {
    partnerCode: PARTNER_CODE,
    accessKey: ACCESS_KEY,
    secretKey: SECRET_KEY,
    endpoint: "https://test-payment.momo.vn/v2/gateway/api/create",
    // Redirect về Backend để xử lý điều hướng
    redirectUrl: `${BACKEND_URL}/api/payment/payment-result`,
    // Webhook để MoMo gọi ngầm báo kết quả
    ipnUrl: `${BACKEND_URL}/api/payment/momo-ipn`
};

const generateTransId = () => `MOMO${Date.now()}`;

// ============================================================
// 1. TẠO URL THANH TOÁN
// ============================================================
exports.createPaymentUrl = async (req, res) => {
    const { loaiGiaoDich, referenceId } = req.body;

    try {
        const pool = await sql.connect(config);
        let amount = 0;

        // --- Lấy số tiền từ Database ---
        if (loaiGiaoDich === 'DonHang') {
            const orderResult = await pool.request()
                .input('MaDH', sql.VarChar, referenceId)
                .query("SELECT TongTien FROM DonHang WHERE MaDH = @MaDH");
            
            if (orderResult.recordset.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
            amount = orderResult.recordset[0].TongTien;

        } else if (loaiGiaoDich === 'PhiPhat') {
            const fineResult = await pool.request()
                .input('MaTra', sql.VarChar, referenceId)
                .query("SELECT TongTienPhat FROM TraSach WHERE MaTra = @MaTra");
            
            if (fineResult.recordset.length === 0) return res.status(404).json({ message: "Không tìm thấy phiếu trả sách." });
            amount = fineResult.recordset[0].TongTienPhat;

        } else {
            return res.status(400).json({ message: "Loại giao dịch không hợp lệ." });
        }

        if (!amount || amount <= 0) return res.status(400).json({ message: "Số tiền không hợp lệ." });
        amount = Math.round(amount);

        // --- Tạo giao dịch MoMo ---
        const orderId = generateTransId();
        const requestId = orderId;
        const orderInfo = `Thanh toan ${loaiGiaoDich} ${referenceId}`;
        const maTT = `TT${Date.now().toString().slice(-8)}`;
        
        let maDH = loaiGiaoDich === 'DonHang' ? referenceId : null;
        let maPhat = loaiGiaoDich === 'PhiPhat' ? referenceId : null;

        // Lưu trạng thái 'KhoiTao' vào DB
        await pool.request()
            .input('MaTT', sql.VarChar, maTT)
            .input('MaDH', sql.VarChar, maDH)
            .input('MaPhat', sql.VarChar, maPhat)
            .input('SoTien', sql.Decimal, amount)
            .input('MaGiaoDich', sql.VarChar, orderId)
            .input('LoaiGiaoDich', sql.NVarChar, loaiGiaoDich)
            .query(`
                INSERT INTO ThanhToan (MaTT, MaDH, MaPhat, PhuongThuc, SoTien, TrangThai, MaGiaoDich, NgayThanhToan, LoaiGiaoDich)
                VALUES (@MaTT, @MaDH, @MaPhat, 'MoMo', @SoTien, N'KhoiTao', @MaGiaoDich, GETDATE(), @LoaiGiaoDich)
            `);

        // Tạo chữ ký (Signature)
        const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${MOMO_CONFIG.redirectUrl}&requestId=${requestId}&requestType=captureWallet`;
        
        const signature = crypto.createHmac('sha256', MOMO_CONFIG.secretKey)
            .update(rawSignature)
            .digest('hex');

        // Gửi request sang MoMo
        const requestBody = {
            partnerCode: MOMO_CONFIG.partnerCode,
            partnerName: "Thu Vien Nhom 10",
            storeId: "MomoTestStore",
            requestId: requestId,
            amount: amount,
            orderId: orderId,
            orderInfo: orderInfo,
            redirectUrl: MOMO_CONFIG.redirectUrl,
            ipnUrl: MOMO_CONFIG.ipnUrl,
            lang: "vi",
            requestType: "captureWallet",
            autoCapture: true,
            extraData: "",
            signature: signature,
        };

        const momoResponse = await axios.post(MOMO_CONFIG.endpoint, requestBody);
        return res.json({ payUrl: momoResponse.data.payUrl });

    } catch (err) {
        console.error("Lỗi tạo thanh toán:", err);
        return res.status(500).json({ message: "Lỗi Server: " + err.message });
    }
};

// ============================================================
// 2. XỬ LÝ IPN (WEBHOOK TỪ MOMO) - TỰ ĐỘNG DUYỆT ĐƠN
// ============================================================
exports.handleMomoCallback = async (req, res) => {
    const { resultCode, orderId } = req.body;
    
    // Luôn trả về 204 No Content trước để MoMo không gọi lại nhiều lần
    // Server sẽ tự xử lý ngầm bên dưới
    
    if (resultCode == 0) {
        try {
            const pool = await sql.connect(config);
            
            // 1. Cập nhật trạng thái trong bảng ThanhToan -> 'HoanThanh'
            const result = await pool.request()
                .input('MaGiaoDich', sql.VarChar, orderId)
                .query(`
                    UPDATE ThanhToan 
                    SET TrangThai = N'HoanThanh', NgayThanhToan = GETDATE()
                    OUTPUT inserted.LoaiGiaoDich, inserted.MaDH, inserted.MaPhat, inserted.SoTien
                    WHERE MaGiaoDich = @MaGiaoDich
                `);

            if (result.recordset.length > 0) {
                const { LoaiGiaoDich, MaDH, MaPhat, SoTien } = result.recordset[0];

                // 2. Nếu là Đơn Hàng -> TỰ ĐỘNG DUYỆT
                if (LoaiGiaoDich === 'DonHang' && MaDH) {
                    await pool.request()
                        .input('MaDH', sql.VarChar, MaDH)
                        .input('TongTien', sql.Decimal, SoTien)
                        .query(`
                            UPDATE DonHang 
                            SET 
                                -- Xác nhận đã nhận tiền
                                TrangThaiThanhToan = N'DaThanhToan',
                                
                                -- 🔥 QUAN TRỌNG: Tự động chuyển trạng thái sang 'Đang Giao' 
                                -- (Admin thấy đơn này là đi giao luôn, không cần bấm duyệt nữa)
                                TrangThai = N'DangGiao',
                                
                                -- Cập nhật lại số tiền chốt sổ
                                TongTien = @TongTien
                            WHERE MaDH = @MaDH
                        `);
                    console.log(`✅ Auto-Approve: Đơn hàng ${MaDH} đã thanh toán & chuyển sang Đang Giao.`);
                } 
                
                // 3. Nếu là Phí Phạt -> Cập nhật tiền phạt
                else if (LoaiGiaoDich === 'PhiPhat' && MaPhat) {
                    await pool.request()
                        .input('MaTra', sql.VarChar, MaPhat)
                        .input('TongTienPhat', sql.Decimal, SoTien)
                        .query(`
                            UPDATE TraSach 
                            SET TongTienPhat = @TongTienPhat
                            WHERE MaTra = @MaTra
                        `);
                    console.log(`✅ Phí phạt ${MaPhat} đã được thanh toán.`);
                }
            }
        } catch (err) {
            console.error("❌ Lỗi IPN Update DB:", err);
        }
    } else {
        // Giao dịch thất bại
        try {
            const pool = await sql.connect(config);
            await pool.request()
                .input('MaGiaoDich', sql.VarChar, orderId)
                .query("UPDATE ThanhToan SET TrangThai = N'Loi' WHERE MaGiaoDich = @MaGiaoDich");
        } catch(e) {}
    }

    return res.status(204).json({});
};

// ============================================================
// 3. XỬ LÝ REDIRECT (Đưa người dùng về Frontend)
// ============================================================
exports.checkPaymentResult = async (req, res) => {
    // MoMo redirect về đây kèm theo params
    const { resultCode, orderId, message } = req.query;

    // Điều hướng về trang Frontend
    // Bạn nhớ tạo route bên Frontend (React/Vue/HTML) để đón
    if (resultCode == 0) {
        // Ví dụ: https://web-cua-ban.vercel.app/thanh-cong?orderId=...
        return res.redirect(`${FRONTEND_URL}/payment-success?orderId=${orderId}`);
    } else {
        // Ví dụ: https://web-cua-ban.vercel.app/that-bai?reason=...
        return res.redirect(`${FRONTEND_URL}/payment-failed?reason=${encodeURIComponent(message)}`);
    }
};

// ============================================================
// 4. LẤY LỊCH SỬ GIAO DỊCH (ADMIN)
// ============================================================
exports.getTransactionList = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT 
                TT.MaTT, TT.MaGiaoDich AS MaMoMo, TT.SoTien, TT.PhuongThuc, 
                TT.TrangThai, TT.NgayThanhToan, TT.LoaiGiaoDich,
                COALESCE(TT.MaDH, TT.MaPhat) AS MaThamChieu,
                CASE 
                    WHEN TT.LoaiGiaoDich = 'DonHang' THEN DG_DH.HoTen 
                    WHEN TT.LoaiGiaoDich = 'PhiPhat' THEN DG_TS.HoTen 
                    ELSE N'Khách vãng lai' 
                END AS NguoiThanhToan
            FROM ThanhToan TT
            LEFT JOIN DonHang DH ON TT.MaDH = DH.MaDH
            LEFT JOIN DocGia DG_DH ON DH.MaDG = DG_DH.MaDG
            LEFT JOIN TraSach TS ON TT.MaPhat = TS.MaTra
            LEFT JOIN MuonSach MS ON TS.MaMuon = MS.MaMuon
            LEFT JOIN DocGia DG_TS ON MS.MaDG = DG_TS.MaDG
            ORDER BY TT.NgayThanhToan DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi server." });
    }
};

// ============================================================
// 5. LẤY LỊCH SỬ GIAO DỊCH (USER/ĐỘC GIẢ)
// ============================================================
exports.getMyTransactions = async (req, res) => {
    const { MaDG } = req.user;
    if (!MaDG) return res.status(403).json({ message: "Không phải độc giả." });

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('MaDG', sql.VarChar, MaDG)
            .query(`
                SELECT 
                    TT.MaTT, TT.MaGiaoDich, TT.SoTien, TT.TrangThai, 
                    TT.NgayThanhToan, TT.LoaiGiaoDich,
                    COALESCE(TT.MaDH, TT.MaPhat) AS MaThamChieu
                FROM ThanhToan TT
                LEFT JOIN DonHang DH ON TT.MaDH = DH.MaDH
                LEFT JOIN TraSach TS ON TT.MaPhat = TS.MaTra
                LEFT JOIN MuonSach MS ON TS.MaMuon = MS.MaMuon
                WHERE (TT.LoaiGiaoDich = 'DonHang' AND DH.MaDG = @MaDG)
                   OR (TT.LoaiGiaoDich = 'PhiPhat' AND MS.MaDG = @MaDG)
                ORDER BY TT.NgayThanhToan DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi server." });
    }
};

// ============================================================
// 6. CẬP NHẬT TRẠNG THÁI THỦ CÔNG (ADMIN)
// ============================================================
exports.updateTransactionStatus = async (req, res) => {
    const { maTT, trangThai } = req.body;
    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = new sql.Request(transaction);

        // Update bảng ThanhToan
        await request.query(`UPDATE ThanhToan SET TrangThai = '${trangThai}' WHERE MaTT = '${maTT}'`);

        // Đồng bộ nếu Hoàn Thành
        if (trangThai === 'HoanThanh') {
            const transResult = await request.query(`SELECT MaDH FROM ThanhToan WHERE MaTT = '${maTT}'`);
            if (transResult.recordset.length > 0) {
                const maDH = transResult.recordset[0].MaDH;
                if (maDH) {
                    await request.query(`UPDATE DonHang SET TrangThaiThanhToan = N'DaThanhToan' WHERE MaDH = '${maDH}'`);
                }
            }
        }
        await transaction.commit();
        res.status(200).json({ message: "Cập nhật thành công!" });
    } catch (error) {
        if (transaction) await transaction.rollback();
        res.status(500).json({ message: "Lỗi server." });
    }
};

// ============================================================
// 7. GIAO DỊCH TIỀN MẶT COD (INTERNAL)
// ============================================================
exports.createCODTransaction = async (maDH, soTien) => {
    try {
        const pool = await sql.connect(config);
        // Check trùng
        const check = await pool.request()
            .input('MaDH', sql.VarChar, maDH)
            .query("SELECT MaTT FROM ThanhToan WHERE MaDH = @MaDH AND TrangThai = N'HoanThanh'");
        if (check.recordset.length > 0) return true;

        const maTT = `COD${Date.now().toString().slice(-8)}`;
        const maGiaoDich = `CASH_${maDH}`;

        await pool.request()
            .input('MaTT', sql.VarChar, maTT)
            .input('MaDH', sql.VarChar, maDH)
            .input('SoTien', sql.Decimal, soTien)
            .input('MaGiaoDich', sql.VarChar, maGiaoDich)
            .query(`
                INSERT INTO ThanhToan (MaTT, MaDH, PhuongThuc, SoTien, TrangThai, MaGiaoDich, NgayThanhToan, LoaiGiaoDich)
                VALUES (@MaTT, @MaDH, 'COD', @SoTien, N'HoanThanh', @MaGiaoDich, GETDATE(), 'DonHang')
            `);
        return true;
    } catch (err) {
        console.error("Lỗi COD:", err);
        return false;
    }
};