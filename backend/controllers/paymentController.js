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
    ipnUrl: "https://webhook.site/..." // Điền link webhook thật nếu có
};

const generateTransId = () => `MOMO${Date.now()}`;

// ============================================================
// 1. TẠO URL THANH TOÁN (ĐÃ SỬA: LẤY TIỀN TỪ DB)
// ============================================================
exports.createPaymentUrl = async (req, res) => {
    // Chỉ cần loaiGiaoDich và referenceId. Amount sẽ tự tính lại.
    const { loaiGiaoDich, referenceId } = req.body;

    try {
        const pool = await sql.connect(config);
        
        // 1. 🔥 QUAN TRỌNG: Lấy số tiền thực tế từ Database
        let amount = 0;
        
        if (loaiGiaoDich === 'DonHang') {
            // Lấy TongTien từ bảng DonHang
            const orderResult = await pool.request()
                .input('MaDH', sql.VarChar, referenceId)
                .query("SELECT TongTien FROM DonHang WHERE MaDH = @MaDH");
            
            if (orderResult.recordset.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
            }
            amount = orderResult.recordset[0].TongTien;

        } else if (loaiGiaoDich === 'PhiPhat') {
            // Lấy TongTienPhat từ bảng TraSach
            const fineResult = await pool.request()
                .input('MaTra', sql.VarChar, referenceId)
                .query("SELECT TongTienPhat FROM TraSach WHERE MaTra = @MaTra");
            
            if (fineResult.recordset.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy phiếu trả sách." });
            }
            amount = fineResult.recordset[0].TongTienPhat;
        } else {
            return res.status(400).json({ message: "Loại giao dịch không hợp lệ." });
        }

        // Kiểm tra nếu số tiền <= 0 hoặc null
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Số tiền thanh toán không hợp lệ (0đ)." });
        }
        
        // Chuyển amount về dạng số nguyên (Momo yêu cầu không có số thập phân)
        amount = Math.round(amount);

        // 2. Tiếp tục quy trình Momo như cũ
        const orderId = generateTransId(); 
        const requestId = orderId;
        const orderInfo = `Thanh toan ${loaiGiaoDich} ${referenceId}`;
        
        const maTT = `TT${Date.now().toString().slice(-8)}`; 
        let maDH = loaiGiaoDich === 'DonHang' ? referenceId : null;
        let maPhat = loaiGiaoDich === 'PhiPhat' ? referenceId : null;

        // Lưu vào bảng ThanhToan
        await pool.request()
            .input('MaTT', sql.VarChar, maTT)
            .input('MaDH', sql.VarChar, maDH)
            .input('MaPhat', sql.VarChar, maPhat)
            .input('SoTien', sql.Decimal, amount) // Lưu đúng số tiền lấy từ DB
            .input('MaGiaoDich', sql.VarChar, orderId)
            .input('LoaiGiaoDich', sql.NVarChar, loaiGiaoDich)
            .query(`
                INSERT INTO ThanhToan (MaTT, MaDH, MaPhat, PhuongThuc, SoTien, TrangThai, MaGiaoDich, NgayThanhToan, LoaiGiaoDich)
                VALUES (@MaTT, @MaDH, @MaPhat, 'MoMo', @SoTien, N'KhoiTao', @MaGiaoDich, GETDATE(), @LoaiGiaoDich)
            `);

        // Tạo chữ ký Momo
        const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${MOMO_CONFIG.redirectUrl}&requestId=${requestId}&requestType=captureWallet`;

        const signature = crypto.createHmac('sha256', MOMO_CONFIG.secretKey)
            .update(rawSignature)
            .digest('hex');

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
        return res.status(500).json({ message: "Lỗi tạo giao dịch: " + err.message });
    }
};

// ============================================================
// 2. XỬ LÝ IPN (MOMO GỌI LẠI) - ĐÃ CẬP NHẬT ĐỂ ĐỒNG BỘ
// ============================================================
exports.handleMomoCallback = async (req, res) => {
    const { resultCode, orderId } = req.body; // Không cần tin tưởng 'amount' từ Momo gửi về, chỉ cần check orderId
    
    if (resultCode === 0) {
        try {
            const pool = await sql.connect(config);
            
            // Cập nhật trạng thái ThanhToan
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

                // Cập nhật trạng thái nghiệp vụ chính
                if (LoaiGiaoDich === 'DonHang' && MaDH) {
                    // Cập nhật trạng thái Đơn Hàng
                    // ⚠️ Đảm bảo TongTien trong đơn hàng khớp với số tiền đã thanh toán (Optional: Update lại lần nữa cho chắc)
                    await pool.request()
                        .input('MaDH', sql.VarChar, MaDH)
                        .input('TongTien', sql.Decimal, SoTien) 
                        .query(`
                            UPDATE DonHang 
                            SET TrangThaiThanhToan = N'DaThanhToan',
                                TrangThai = N'DangGiao', -- Chuyển trạng thái để admin biết đường giao
                                TongTien = @TongTien     -- Cập nhật lại giá chốt cuối cùng (để khớp báo cáo)
                            WHERE MaDH = @MaDH
                        `);
                } 
                else if (LoaiGiaoDich === 'PhiPhat' && MaPhat) {
                    // Với phí phạt, MaPhat = MaTra
                    // Cập nhật lại TongTienPhat trong bảng TraSach cho khớp số tiền đã trả
                    await pool.request()
                         .input('MaTra', sql.VarChar, MaPhat)
                         .input('TongTienPhat', sql.Decimal, SoTien)
                         .query(`
                            UPDATE TraSach 
                            SET TongTienPhat = @TongTienPhat -- Cập nhật giá chốt
                            WHERE MaTra = @MaTra
                         `);
                }
            }
        } catch (err) {
            console.error("Lỗi cập nhật DB từ IPN:", err);
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
// 3. LẤY LỊCH SỬ GIAO DỊCH (ADMIN)
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
        console.error("Lỗi lấy lịch sử giao dịch:", err);
        res.status(500).json({ message: "Lỗi server." });
    }
};

// ============================================================
// 4. LẤY LỊCH SỬ GIAO DỊCH (USER)
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

exports.updateTransactionStatus = async (req, res) => {
    const { maTT, trangThai } = req.body; // trangThai thường là 'HoanThanh'

    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1. Cập nhật bảng ThanhToan
        request.input('MaTT', sql.VarChar, maTT);
        request.input('TrangThai', sql.NVarChar, trangThai);
        
        await request.query(`
            UPDATE ThanhToan 
            SET TrangThai = @TrangThai 
            WHERE MaTT = @MaTT
        `);

        // 2. 🔥 LOGIC TỰ ĐỘNG ĐỒNG BỘ ĐƠN HÀNG 🔥
        if (trangThai === 'HoanThanh') {
            // Tìm Mã Đơn Hàng (MaDH) gắn với giao dịch này
            // (Dùng request của transaction để đảm bảo nhất quán)
            const transResult = await request.query(`SELECT MaDH FROM ThanhToan WHERE MaTT = @MaTT`);
            
            if (transResult.recordset.length > 0) {
                const maDH = transResult.recordset[0].MaDH;

                // Nếu có MaDH (tức là thanh toán cho đơn hàng), cập nhật đơn hàng luôn
                if (maDH) {
                    await request.query(`
                        UPDATE DonHang 
                        SET TrangThaiThanhToan = N'DaThanhToan' 
                        WHERE MaDH = '${maDH}'
                    `);
                    console.log(`✅ Đã đồng bộ trạng thái 'DaThanhToan' cho đơn hàng: ${maDH}`);
                }
            }
        }

        await transaction.commit();
        res.status(200).json({ message: "Cập nhật thành công & Đã đồng bộ đơn hàng!" });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Lỗi cập nhật giao dịch:", error);
        res.status(500).json({ message: "Lỗi server khi cập nhật trạng thái." });
    }
};
// ============================================================
// 5. XÁC NHẬN THANH TOÁN TIỀN MẶT (CHO ĐƠN COD)
// Hàm này sẽ được gọi từ orderController khi Admin bấm "Hoàn thành"
// ============================================================
exports.createCODTransaction = async (maDH, soTien) => {
    try {
        const pool = await sql.connect(config);
        const maTT = `COD${Date.now().toString().slice(-8)}`;
        const maGiaoDich = `CASH_${maDH}`; // Mã tham chiếu nội bộ

        // Kiểm tra xem đã có giao dịch chưa để tránh trùng lặp
        const check = await pool.request()
            .input('MaDH', sql.VarChar, maDH)
            .query("SELECT MaTT FROM ThanhToan WHERE MaDH = @MaDH AND TrangThai = N'HoanThanh'");
        
        if (check.recordset.length > 0) return; // Đã có rồi thì thôi

        // Insert vào bảng ThanhToan
        await pool.request()
            .input('MaTT', sql.VarChar, maTT)
            .input('MaDH', sql.VarChar, maDH)
            .input('SoTien', sql.Decimal, soTien)
            .input('MaGiaoDich', sql.VarChar, maGiaoDich)
            .query(`
                INSERT INTO ThanhToan (MaTT, MaDH, PhuongThuc, SoTien, TrangThai, MaGiaoDich, NgayThanhToan, LoaiGiaoDich)
                VALUES (@MaTT, @MaDH, 'COD', @SoTien, N'HoanThanh', @MaGiaoDich, GETDATE(), 'DonHang')
            `);
            
        console.log(`✅ Đã tạo giao dịch COD cho đơn ${maDH}`);
        return true;
    } catch (err) {
        console.error("❌ Lỗi tạo giao dịch COD:", err);
        return false;
    }
};