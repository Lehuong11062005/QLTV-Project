// controllers/paymentController.js
const sql = require('mssql');
const config = require('../db/dbConfig');
const axios = require('axios');
const crypto = require('crypto');

// CẤU HÌNH MOMO (Dùng tài khoản TEST của bạn)
const MOMO_CONFIG = {
    partnerCode: "MOMO", 
    accessKey: "F8BBA842ECF85", 
    secretKey: "K951B6PE1waDMi640xX08PD3vg6EkVlz", 
    endpoint: "https://test-payment.momo.vn/v2/gateway/api/create",
    redirectUrl: "http://localhost:3000/payment-result", 
    ipnUrl: "https://webhook.site/..." // Hoặc link ngrok của bạn
};

// Hàm tạo ID giao dịch duy nhất
const generateTransId = () => `MOMO${Date.now()}`;

// ============================================================
// 1. TẠO URL THANH TOÁN (GỌI TỪ REACT)
// ============================================================
exports.createPaymentUrl = async (req, res) => {
    // loaiGiaoDich: 'DonHang' hoặc 'PhiPhat'
    // referenceId: MaDH (nếu là đơn hàng) hoặc MaTra (nếu là phí phạt)
    const { loaiGiaoDich, referenceId, amount } = req.body;

    const orderId = generateTransId(); // Mã giao dịch duy nhất cho lần thanh toán này
    const requestId = orderId;
    const orderInfo = `Thanh toan ${loaiGiaoDich} ${referenceId}`;
    
    // Lưu tạm vào bảng ThanhToan với trạng thái 'KhoiTao'
    try {
        const pool = await sql.connect(config);
        
        // Tạo mã thanh toán (MaTT)
        const maTT = `TT${Date.now().toString().slice(-8)}`; 

        let maDH = null;
        let maPhat = null; // Trong DB bạn gọi là MaPhat, nhưng logic là liên kết với MaTra

        if (loaiGiaoDich === 'DonHang') maDH = referenceId;
        if (loaiGiaoDich === 'PhiPhat') maPhat = referenceId;

        await pool.request()
            .input('MaTT', sql.VarChar, maTT)
            .input('MaDH', sql.VarChar, maDH)
            .input('MaPhat', sql.VarChar, maPhat)
            .input('SoTien', sql.Decimal, amount)
            .input('MaGiaoDich', sql.VarChar, orderId) // Lưu tạm orderId MoMo vào đây để đối chiếu
            .input('LoaiGiaoDich', sql.NVarChar, loaiGiaoDich)
            .query(`
                INSERT INTO ThanhToan (MaTT, MaDH, MaPhat, PhuongThuc, SoTien, TrangThai, MaGiaoDich, NgayThanhToan, LoaiGiaoDich)
                VALUES (@MaTT, @MaDH, @MaPhat, 'MoMo', @SoTien, N'KhoiTao', @MaGiaoDich, GETDATE(), @LoaiGiaoDich)
            `);

        // --- TẠO CHỮ KÝ MOMO ---
        const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${MOMO_CONFIG.redirectUrl}&requestId=${requestId}&requestType=captureWallet`;

        const signature = crypto.createHmac('sha256', MOMO_CONFIG.secretKey)
            .update(rawSignature)
            .digest('hex');

        // --- GỬI REQUEST SANG MOMO ---
        const requestBody = {
            partnerCode: MOMO_CONFIG.partnerCode,
            partnerName: "Thu Vien Moi",
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
        
        // Trả về URL thanh toán cho React redirect
        return res.json({ payUrl: momoResponse.data.payUrl });

    } catch (err) {
        console.error("Lỗi tạo thanh toán:", err);
        return res.status(500).json({ message: "Lỗi tạo giao dịch MoMo" });
    }
};

// ============================================================
// 2. XỬ LÝ IPN (MOMO GỌI LẠI KHI KHÁCH ĐÃ TRẢ TIỀN)
// ============================================================
exports.handleMomoCallback = async (req, res) => {
    const { resultCode, orderId, amount } = req.body;
    
    // resultCode = 0 nghĩa là thành công
    if (resultCode === 0) {
        try {
            const pool = await sql.connect(config);
            
            // 1. Cập nhật bảng ThanhToan thành công
            // Sử dụng orderId (đã lưu vào MaGiaoDich lúc tạo) để tìm bản ghi
            const result = await pool.request()
                .input('MaGiaoDich', sql.VarChar, orderId)
                .query(`
                    UPDATE ThanhToan 
                    SET TrangThai = N'HoanThanh', NgayThanhToan = GETDATE()
                    OUTPUT inserted.LoaiGiaoDich, inserted.MaDH, inserted.MaPhat
                    WHERE MaGiaoDich = @MaGiaoDich
                `);

            if (result.recordset.length > 0) {
                const { LoaiGiaoDich, MaDH, MaPhat } = result.recordset[0];

                // 2. Cập nhật trạng thái nghiệp vụ (Đơn hàng hoặc Phạt)
                if (LoaiGiaoDich === 'DonHang' && MaDH) {
                    await pool.request()
                        .input('MaDH', sql.VarChar, MaDH)
                        .query("UPDATE DonHang SET TrangThaiThanhToan = N'DaThanhToan' WHERE MaDH = @MaDH");
                } 
                else if (LoaiGiaoDich === 'PhiPhat' && MaPhat) {
                    // MaPhat ở đây chính là MaTra trong bảng TraSach (do thiết kế bảng ThanhToan dùng MaPhat)
                    // Giả sử khi thanh toán xong thì coi như đã xử lý phạt xong
                    // Bạn có thể cần thêm cột TrangThaiPhat vào TraSach, hoặc chỉ cần dựa vào bảng ThanhToan là đủ
                    console.log(`Đã thanh toán phạt cho mã trả sách: ${MaPhat}`);
                }
            }
        } catch (err) {
            console.error("Lỗi cập nhật DB từ IPN:", err);
        }
    } else {
        // Giao dịch thất bại -> Cập nhật trạng thái Loi
        try {
            const pool = await sql.connect(config);
            await pool.request()
                .input('MaGiaoDich', sql.VarChar, orderId)
                .query("UPDATE ThanhToan SET TrangThai = N'Loi' WHERE MaGiaoDich = @MaGiaoDich");
        } catch(e) {}
    }

    // Luôn trả về 204 cho MoMo để họ không gửi lại
    return res.status(204).json({});
};

// ============================================================
// 3. LẤY LỊCH SỬ GIAO DỊCH (CHO TRANG ADMIN RIÊNG)
// ============================================================
exports.getTransactionList = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        // Query này nối bảng để lấy thêm thông tin ngữ cảnh (Tên người trả tiền)
        // Logic: Nếu là DonHang -> Lấy MaDG từ DonHang. Nếu là PhiPhat -> Lấy MaTra -> MaMuon -> MaDG
        const result = await pool.request().query(`
            SELECT 
                TT.MaTT, 
                TT.MaGiaoDich AS MaMoMo,
                TT.SoTien, 
                TT.PhuongThuc, 
                TT.TrangThai, 
                TT.NgayThanhToan, 
                TT.LoaiGiaoDich, -- 'DonHang' hoặc 'PhiPhat'
                TT.NoiDung,
                COALESCE(TT.MaDH, TT.MaPhat) AS MaThamChieu, -- Mã đơn hàng hoặc Mã trả sách
                CASE 
                    WHEN TT.LoaiGiaoDich = 'DonHang' THEN DG_DH.HoTen 
                    WHEN TT.LoaiGiaoDich = 'PhiPhat' THEN DG_TS.HoTen 
                    ELSE N'Khách vãng lai' 
                END AS NguoiThanhToan
            FROM ThanhToan TT
            -- Join để lấy tên người mua (Đơn hàng)
            LEFT JOIN DonHang DH ON TT.MaDH = DH.MaDH
            LEFT JOIN DocGia DG_DH ON DH.MaDG = DG_DH.MaDG
            -- Join để lấy tên người nộp phạt (Trả sách -> Mượn sách -> Độc giả)
            LEFT JOIN TraSach TS ON TT.MaPhat = TS.MaTra
            LEFT JOIN MuonSach MS ON TS.MaMuon = MS.MaMuon
            LEFT JOIN DocGia DG_TS ON MS.MaDG = DG_TS.MaDG
            
            ORDER BY TT.NgayThanhToan DESC
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Lỗi lấy lịch sử giao dịch:", err);
        res.status(500).json({ message: "Lỗi server khi tải giao dịch." });
    }
};

// Thêm hàm cập nhật trạng thái thủ công (nếu MoMo lỗi IPN)
exports.updateTransactionStatus = async (req, res) => {
    const { maTT, trangThai } = req.body;
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('MaTT', sql.VarChar, maTT)
            .input('TrangThai', sql.NVarChar, trangThai)
            .query("UPDATE ThanhToan SET TrangThai = @TrangThai WHERE MaTT = @MaTT");
        res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi cập nhật trạng thái" });
    }
};
// ============================================================
// 4. LẤY LỊCH SỬ GIAO DỊCH CỦA TÔI (CHO USER) - BỔ SUNG THÊM
// ============================================================
exports.getMyTransactions = async (req, res) => {
    // Middleware authenticateToken đã gắn MaDG vào req.user
    const { MaDG } = req.user;

    if (!MaDG) {
        return res.status(403).json({ message: "Tài khoản này không phải là Độc giả hợp lệ." });
    }

    try {
        const pool = await sql.connect(config);
        
        // Query trực tiếp sử dụng MaDG từ token
        const result = await pool.request()
            .input('MaDG', sql.VarChar, MaDG)
            .query(`
                SELECT 
                    TT.MaTT, 
                    TT.MaGiaoDich,
                    TT.SoTien, 
                    TT.TrangThai, 
                    TT.NgayThanhToan, 
                    TT.LoaiGiaoDich, 
                    TT.NoiDung,
                    COALESCE(TT.MaDH, TT.MaPhat) AS MaThamChieu
                FROM ThanhToan TT
                LEFT JOIN DonHang DH ON TT.MaDH = DH.MaDH
                LEFT JOIN TraSach TS ON TT.MaPhat = TS.MaTra
                LEFT JOIN MuonSach MS ON TS.MaMuon = MS.MaMuon
                WHERE 
                    (TT.LoaiGiaoDich = 'DonHang' AND DH.MaDG = @MaDG)
                    OR 
                    (TT.LoaiGiaoDich = 'PhiPhat' AND MS.MaDG = @MaDG)
                ORDER BY TT.NgayThanhToan DESC
            `);

        res.json(result.recordset);

    } catch (err) {
        console.error("Lỗi lấy lịch sử giao dịch cá nhân:", err);
        res.status(500).json({ message: "Lỗi server khi tải lịch sử." });
    }
};