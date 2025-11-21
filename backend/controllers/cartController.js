const sql = require('mssql');

// ================================================================================
// ⚙️ CẤU HÌNH HỆ THỐNG (HARDCODED)
// ================================================================================
const SYSTEM_CONFIG = {
    NGUONG_TIEN_PHAT: 50000, // 50.000 VND
    MAX_MUON_TOI_DA: 5       // 5 cuốn sách
};

// ================================================================================
// 🔑 HÀM TẠO ID DUY NHẤT (HELPER FUNCTION)
// ================================================================================
const getUniqueId = async (request, prefix, tableName, idColumn) => {
    const queryMaxId = `
        SELECT MAX(CAST(SUBSTRING(${idColumn}, 3, 10) AS INT)) AS MaxId
        FROM ${tableName}
        WHERE ${idColumn} LIKE '${prefix}[0-9]%'
    `;
    const result = await request.query(queryMaxId);
    let currentMaxNumber = result.recordset[0].MaxId || 0;
    const newNumber = currentMaxNumber + 1;
    const paddedNumber = newNumber.toString().padStart(8, '0');
    return `${prefix}${paddedNumber}`;
};

const cartController = {
    
    // ================================================================================
    // 🛒 GIỎ MƯỢN SÁCH (LOAN CART)
    // ================================================================================
    getLoanCart: async (req, res) => {
        try {
            const maDG = req.user.MaDG;
            const gioMuonResult = await sql.query`SELECT MaGM, MaDG, TongSoLuong, NgayTao FROM GioMuon WHERE MaDG = ${maDG}`;

            if (!gioMuonResult.recordset.length) {
                return res.json({
                    code: 200,
                    data: { maGM: null, maDG: maDG, tongSoLuong: 0, ngayTao: null, chiTiet: [] }
                });
            }
            const maGioMuon = gioMuonResult.recordset[0].MaGM; 
            const chiTietResult = await sql.query`
                SELECT gms.MaSach, s.TenSach, s.AnhMinhHoa, gms.SoLuong as soLuongYeuCau, s.SoLuongTon,
                CASE WHEN gms.SoLuong > s.SoLuongTon THEN 1 ELSE 0 END as viPhamGioiHan
                FROM GioMuon_Sach gms
                JOIN Sach s ON gms.MaSach = s.MaSach
                WHERE gms.MaGM = ${maGioMuon} 
            `;
            res.json({
                code: 200,
                data: {
                    maGM: maGioMuon, maDG: gioMuonResult.recordset[0].MaDG,
                    tongSoLuong: gioMuonResult.recordset[0].TongSoLuong,
                    ngayTao: gioMuonResult.recordset[0].NgayTao, chiTiet: chiTietResult.recordset
                }
            });
        } catch (error) {
            console.error('❌ Lỗi lấy giỏ mượn:', error);
            res.status(500).json({ code: 500, message: 'Lỗi server khi lấy giỏ mượn' });
        }
    },

    addToLoanCart: async (req, res) => {
        const transaction = new sql.Transaction();
        try {
            const { maSach, MaSach, soLuong, SoLuong } = req.body;
            const bookId = MaSach || maSach; 
            const quantity = parseInt(SoLuong || soLuong || 1);
            const maDG = req.user.MaDG;

            console.log(`➡️ [LOAN] Yêu cầu thêm: MaDG=${maDG}, MaSach=${bookId}, SL=${quantity}`);

            if (!maDG) return res.status(401).json({ message: 'Lỗi: Token không hợp lệ.' });
            if (!bookId) return res.status(400).json({ message: 'Lỗi: Thiếu Mã Sách.' });

            await transaction.begin();
            // ❌ KHÔNG dùng: const request = transaction.request(); ở đây

            // ---------------------------------------------------------
            // BƯỚC 1: KIỂM TRA ĐỘC GIẢ
            // ---------------------------------------------------------
            // ✅ Dùng transaction.request() cho MỖI câu lệnh riêng biệt
            const docGiaResult = await transaction.request().query`
                SELECT TrangThaiThe, TongPhatChuaThanhToan FROM DocGia WHERE MaDG = ${maDG}
            `;
            
            if (!docGiaResult.recordset.length) {
                await transaction.rollback();
                return res.status(404).json({ message: `Không tìm thấy Độc giả.` });
            }
            
            const { TrangThaiThe, TongPhatChuaThanhToan } = docGiaResult.recordset[0];
            
            const statusClean = TrangThaiThe ? TrangThaiThe.replace(/\s/g, '').toLowerCase() : '';
            if (!['conhan', 'cònhạn', 'hoatdong', 'hoạtđộng'].includes(statusClean)) {
                await transaction.rollback();
                return res.status(400).json({ message: `Thẻ độc giả không khả dụng.` });
            }

            if ((TongPhatChuaThanhToan || 0) > SYSTEM_CONFIG.NGUONG_TIEN_PHAT) {
                await transaction.rollback();
                return res.status(400).json({ message: `Bạn đang nợ phạt quá hạn mức.` });
            }

            // ---------------------------------------------------------
            // BƯỚC 2: KIỂM TRA SÁCH
            // ---------------------------------------------------------
            const sachResult = await transaction.request().query`
                SELECT MaSach, TenSach, SoLuongTon, TinhTrang FROM Sach WHERE MaSach = ${bookId}
            `;

            if (!sachResult.recordset.length) {
                await transaction.rollback();
                return res.status(404).json({ message: `Sách không tồn tại.` });
            }
            
            const book = sachResult.recordset[0];
            const bookStatus = book.TinhTrang ? book.TinhTrang.trim().toLowerCase() : '';

            if (!['con', 'còn', 'san sang', 'sẵn sàng'].includes(bookStatus)) {
                await transaction.rollback();
                return res.status(400).json({ message: `Sách '${book.TenSach}' hiện không khả dụng.` });
            }

            if (book.SoLuongTon < quantity) {
                await transaction.rollback();
                return res.status(400).json({ message: `Kho không đủ số lượng.` });
            }

            // ---------------------------------------------------------
            // BƯỚC 3: TÍNH TOÁN GIỚI HẠN
            // ---------------------------------------------------------
            const dangMuonResult = await transaction.request().query`
                SELECT COUNT(*) as SL_DangMuon 
                FROM MuonSach ms 
                JOIN MuonSach_Sach mss ON ms.MaMuon = mss.MaMuon 
                WHERE ms.MaDG = ${maDG} AND ms.TrangThai NOT IN ('DaTraHet', 'DaHuy')
            `;
            const slDangMuon = dangMuonResult.recordset[0].SL_DangMuon || 0;

            let gioMuonResult = await transaction.request().query`SELECT MaGM, TongSoLuong FROM GioMuon WHERE MaDG = ${maDG}`;
            let maGioMuon;
            let slTrongGio = 0;

            if (!gioMuonResult.recordset.length) {
                const newMaGM = await getUniqueId(transaction.request(), "GM", "GioMuon", "MaGM");
                await transaction.request().query`
                    INSERT INTO GioMuon (MaGM, MaDG, TongSoLuong, NgayTao) 
                    VALUES (${newMaGM}, ${maDG}, 0, GETDATE())
                `;
                maGioMuon = newMaGM;
            } else {
                maGioMuon = gioMuonResult.recordset[0].MaGM;
                slTrongGio = gioMuonResult.recordset[0].TongSoLuong || 0;
            }

            const totalAll = slDangMuon + slTrongGio + quantity;
            const GIOI_HAN = SYSTEM_CONFIG.MAX_MUON_TOI_DA || 5;

            if (totalAll > GIOI_HAN) {
                await transaction.rollback();
                return res.status(400).json({ 
                    code: 400,
                    message: `Vượt quá giới hạn mượn (${GIOI_HAN} cuốn).`,
                    detail: `Đang giữ: ${slDangMuon}, Trong giỏ: ${slTrongGio}, Thêm: ${quantity}.`
                });
            }

            // ---------------------------------------------------------
            // BƯỚC 4: THÊM VÀO GIỎ
            // ---------------------------------------------------------
            const existingItem = await transaction.request().query`
                SELECT * FROM GioMuon_Sach WHERE MaGM = ${maGioMuon} AND MaSach = ${bookId}
            `;

            if (existingItem.recordset.length > 0) {
                await transaction.request().query`
                    UPDATE GioMuon_Sach SET SoLuong = SoLuong + ${quantity} 
                    WHERE MaGM = ${maGioMuon} AND MaSach = ${bookId}
                `;
            } else {
                await transaction.request().query`
                    INSERT INTO GioMuon_Sach (MaGM, MaSach, SoLuong) 
                    VALUES (${maGioMuon}, ${bookId}, ${quantity})
                `;
            }

            // ---------------------------------------------------------
            // BƯỚC 5: CẬP NHẬT TỔNG
            // ---------------------------------------------------------
            await transaction.request().query`
                UPDATE GioMuon 
                SET TongSoLuong = (SELECT SUM(SoLuong) FROM GioMuon_Sach WHERE MaGM = ${maGioMuon})
                WHERE MaGM = ${maGioMuon}
            `;

            await transaction.commit();
            res.json({ code: 200, message: 'Thêm vào giỏ mượn thành công!' });

        } catch (error) {
            if (transaction._aborted === false) {
                try { await transaction.rollback(); } catch (e) {}
            }
            console.error('❌ Lỗi addToLoanCart:', error);
            res.status(500).json({ message: 'Lỗi hệ thống: ' + error.message });
        }
    },
    updateLoanCartItem: async (req, res) => {
        const transaction = new sql.Transaction();
        try {
            // 1. Lấy dữ liệu (Hỗ trợ cả PascalCase)
            const { maSach, MaSach, soLuong, SoLuong } = req.body;
            const bookId = MaSach || maSach;
            const newQty = parseInt(SoLuong || soLuong);
            const maDG = req.user.MaDG;

            if (isNaN(newQty) || newQty < 1) return res.status(400).json({ message: 'Số lượng phải lớn hơn 0.' });

            await transaction.begin();

            // 2. Lấy thông tin Giỏ Mượn
            // 🔥 Dùng transaction.request() cho MỖI câu lệnh để tránh lỗi param
            const gio = await transaction.request().query`SELECT MaGM FROM GioMuon WHERE MaDG = ${maDG}`;
            if (!gio.recordset.length) { 
                await transaction.rollback(); 
                return res.status(404).json({ message: 'Không tìm thấy giỏ mượn.' }); 
            }
            const maGM = gio.recordset[0].MaGM;

            // 3. Lấy thông tin sách trong giỏ (để biết số lượng cũ)
            const item = await transaction.request().query`SELECT SoLuong FROM GioMuon_Sach WHERE MaGM = ${maGM} AND MaSach = ${bookId}`;
            if (!item.recordset.length) { 
                await transaction.rollback(); 
                return res.status(404).json({ message: 'Sách không có trong giỏ.' }); 
            }
            
            const oldQty = item.recordset[0].SoLuong;
            const diff = newQty - oldQty; // Chênh lệch (Ví dụ: đang 1 sửa thành 3 -> diff = +2)

            // 4. Kiểm tra Tồn kho
            const stock = await transaction.request().query`SELECT SoLuongTon FROM Sach WHERE MaSach = ${bookId}`;
            if (newQty > stock.recordset[0].SoLuongTon) {
                await transaction.rollback();
                return res.status(400).json({ message: `Không đủ tồn kho (Còn: ${stock.recordset[0].SoLuongTon}).` });
            }

            // 5. 🔥 KIỂM TRA GIỚI HẠN MƯỢN (Logic quan trọng)
            // Phải tính tổng: (Sách đang giữ) + (Tổng trong giỏ hiện tại) + (Phần chênh lệch)
            
            // A. Lấy số lượng đang giữ (mượn chưa trả)
            const dangMuonResult = await transaction.request().query`
                SELECT COUNT(*) as SL_DangMuon 
                FROM MuonSach ms 
                JOIN MuonSach_Sach mss ON ms.MaMuon = mss.MaMuon 
                WHERE ms.MaDG = ${maDG} AND ms.TrangThai NOT IN ('DaTraHet', 'DaHuy')
            `;
            const slDangMuon = dangMuonResult.recordset[0].SL_DangMuon || 0;

            // B. Lấy tổng trong giỏ hiện tại
            const cartTotalResult = await transaction.request().query`SELECT TongSoLuong FROM GioMuon WHERE MaGM = ${maGM}`;
            const currentCartTotal = cartTotalResult.recordset[0].TongSoLuong || 0;

            // C. Tính tổng dự kiến sau khi update
            const totalAfterUpdate = slDangMuon + currentCartTotal + diff;
            const GIOI_HAN = SYSTEM_CONFIG.MAX_MUON_TOI_DA || 5;

            if (totalAfterUpdate > GIOI_HAN) {
                await transaction.rollback();
                return res.status(400).json({ 
                    code: 400, // Quan trọng để Frontend bắt lỗi
                    message: `Vượt quá giới hạn mượn (${GIOI_HAN} cuốn).`,
                    detail: `Đang giữ: ${slDangMuon}, Trong giỏ: ${currentCartTotal}, Thay đổi: ${diff > 0 ? '+' + diff : diff}.`
                });
            }

            // 6. Cập nhật
            await transaction.request().query`
                UPDATE GioMuon_Sach SET SoLuong = ${newQty} WHERE MaGM = ${maGM} AND MaSach = ${bookId}
            `;

            // Cập nhật tổng số lượng trong giỏ (Tính lại SUM cho chính xác tuyệt đối)
            await transaction.request().query`
                UPDATE GioMuon 
                SET TongSoLuong = (SELECT SUM(SoLuong) FROM GioMuon_Sach WHERE MaGM = ${maGM}) 
                WHERE MaGM = ${maGM}
            `;

            const newTotalResult = await transaction.request().query`SELECT TongSoLuong FROM GioMuon WHERE MaGM = ${maGM}`;

            await transaction.commit();
            
            res.json({ 
                code: 200, 
                data: { tongSoLuongMoi: newTotalResult.recordset[0].TongSoLuong }, 
                message: 'Cập nhật thành công.' 
            });

        } catch (error) {
            if (transaction._aborted === false) {
                try { await transaction.rollback(); } catch (e) {}
            }
            console.error('❌ Lỗi update giỏ mượn:', error);
            res.status(500).json({ code: 500, message: 'Lỗi hệ thống: ' + error.message });
        }
    },

    removeFromLoanCart: async (req, res) => {
        const transaction = new sql.Transaction();
        try {
            const { maSach } = req.params;
            const maDG = req.user.MaDG;

            await transaction.begin();
            const gio = await transaction.request().query`SELECT MaGM FROM GioMuon WHERE MaDG = ${maDG}`;
            if (!gio.recordset.length) { await transaction.rollback(); return res.status(404).json({ message: 'Không tìm thấy giỏ.' }); }
            const maGM = gio.recordset[0].MaGM;

            const item = await transaction.request().query`SELECT SoLuong FROM GioMuon_Sach WHERE MaGM = ${maGM} AND MaSach = ${maSach}`;
            if (!item.recordset.length) { await transaction.rollback(); return res.status(404).json({ message: 'Sách không có trong giỏ.' }); }
            
            const qty = item.recordset[0].SoLuong;
            await transaction.request().query`DELETE FROM GioMuon_Sach WHERE MaGM = ${maGM} AND MaSach = ${maSach}`;
            await transaction.request().query`UPDATE GioMuon SET TongSoLuong = TongSoLuong - ${qty} WHERE MaGM = ${maGM}`;
            const newTotal = await transaction.request().query`SELECT TongSoLuong FROM GioMuon WHERE MaGM = ${maGM}`;

            await transaction.commit();
            res.json({ code: 200, data: { tongSoLuongMoi: newTotal.recordset[0].TongSoLuong }, message: 'Xóa thành công.' });
        } catch (error) {
            try { await transaction.rollback(); } catch (e) {}
            console.error('❌ Lỗi xóa giỏ mượn:', error);
            res.status(500).json({ code: 500, message: 'Lỗi server.' });
        }
    },

    clearLoanCart: async (req, res) => {
        const transaction = new sql.Transaction();
        try {
            const maDG = req.user.MaDG;
            await transaction.begin();
            const gio = await transaction.request().query`SELECT MaGM FROM GioMuon WHERE MaDG = ${maDG}`;
            if (gio.recordset.length) {
                const maGM = gio.recordset[0].MaGM;
                await transaction.request().query`DELETE FROM GioMuon_Sach WHERE MaGM = ${maGM}`;
                await transaction.request().query`DELETE FROM GioMuon WHERE MaGM = ${maGM}`;
            }
            await transaction.commit();
            res.json({ code: 204, message: 'Giỏ đã được làm trống.' });
        } catch (error) {
            try { await transaction.rollback(); } catch (e) {}
            console.error('❌ Lỗi xóa hết giỏ mượn:', error);
            res.status(500).json({ code: 500, message: 'Lỗi server.' });
        }
    },

    // ================================================================================
    // 🛍️ GIỎ MUA SÁCH (PURCHASE CART)
    // ================================================================================

    getPurchaseCart: async (req, res) => {
        try {
            const maDG = req.user.MaDG;
            // 1. Lấy thông tin giỏ hàng chung
            const gioHangResult = await sql.query`SELECT MaGH, MaDG, TamTinh FROM GioHang WHERE MaDG = ${maDG}`;

            if (!gioHangResult.recordset.length) {
                return res.json({ code: 200, data: { maGH: null, maDG: maDG, tamTinh: 0, chiTiet: [] } });
            }

            const maGioHang = gioHangResult.recordset[0].MaGH; 
            
            // 2. Lấy chi tiết sách (FIX LỖI Ở ĐÂY)
            // Thay ghs.DonGia bằng s.GiaBan
            const chiTietResult = await sql.query`
                SELECT 
                    ghs.MaSach, 
                    s.TenSach, 
                    s.AnhMinhHoa, 
                    ghs.SoLuong as soLuongMua, 
                    s.GiaBan as donGia,  -- ✅ Lấy giá từ bảng Sach
                    (ghs.SoLuong * ISNULL(s.GiaBan, 0)) as thanhTien -- ✅ Tính tiền dựa trên giá sách
                FROM GioHang_Sach ghs
                JOIN Sach s ON ghs.MaSach = s.MaSach
                WHERE ghs.MaGH = ${maGioHang}
            `;
            
            res.json({ 
                code: 200, 
                data: { 
                    maGH: maGioHang, 
                    maDG: gioHangResult.recordset[0].MaDG, 
                    tamTinh: gioHangResult.recordset[0].TamTinh, 
                    chiTiet: chiTietResult.recordset 
                } 
            });

        } catch (error) {
            console.error('❌ Lỗi lấy giỏ hàng:', error);
            // Trả về lỗi chi tiết để dễ debug hơn
            res.status(500).json({ code: 500, message: 'Lỗi server: ' + error.message });
        }
    },

    addToPurchaseCart: async (req, res) => {
        const transaction = new sql.Transaction();
        try {
            const { maSach, MaSach, soLuong, SoLuong } = req.body;
            const bookId = MaSach || maSach;
            const quantity = parseInt(SoLuong || soLuong || 1);
            const maDG = req.user.MaDG;

            console.log(`➡️ [PURCHASE] Đang thêm: MaDG=${maDG}, MaSach=${bookId}, SL=${quantity}`);

            if (!maDG) return res.status(401).json({ message: 'Lỗi: Token không hợp lệ.' });
            if (!bookId) return res.status(400).json({ message: 'Lỗi: Thiếu Mã Sách.' });

            await transaction.begin();
            
            // 1. Kiểm tra sách & Giá bán
            const sachResult = await transaction.request().query`
                SELECT MaSach, TenSach, GiaBan, SoLuongTon, TinhTrang FROM Sach WHERE MaSach = ${bookId}
            `;

            if (!sachResult.recordset.length) {
                await transaction.rollback();
                return res.status(404).json({ message: `Sách không tồn tại.` });
            }

            const book = sachResult.recordset[0];
            
            // Kiểm tra giá bán (Phải có giá mới mua được)
            if (!book.GiaBan || book.GiaBan <= 0) {
                await transaction.rollback();
                return res.status(400).json({ message: `Sách '${book.TenSach}' không được bán (Chưa có giá).` });
            }

            if (book.SoLuongTon < quantity) {
                await transaction.rollback();
                return res.status(400).json({ message: `Kho không đủ hàng để bán.` });
            }

            // 2. Lấy hoặc Tạo Giỏ Mua Hàng (GioHang)
            let gioHangResult = await transaction.request().query`SELECT MaGH, TamTinh FROM GioHang WHERE MaDG = ${maDG}`;
            let maGioHang;

            if (!gioHangResult.recordset.length) {
                // Tạo mã Giỏ Hàng mới (Hàm getUniqueId phải có sẵn)
                const newMaGH = await getUniqueId(transaction.request(), "GH", "GioHang", "MaGH");
                
                // Tạo giỏ mới với TamTinh = 0
                await transaction.request().query`
                    INSERT INTO GioHang (MaGH, MaDG, TamTinh) VALUES (${newMaGH}, ${maDG}, 0)
                `;
                maGioHang = newMaGH;
            } else {
                maGioHang = gioHangResult.recordset[0].MaGH;
            }

            // 3. Thêm vào Chi Tiết Giỏ (GioHang_Sach) - KHÔNG LƯU ĐƠN GIÁ Ở ĐÂY
            const existingItem = await transaction.request().query`
                SELECT * FROM GioHang_Sach WHERE MaGH = ${maGioHang} AND MaSach = ${bookId}
            `;

            if (existingItem.recordset.length > 0) {
                // Đã có -> Cộng dồn số lượng
                await transaction.request().query`
                    UPDATE GioHang_Sach 
                    SET SoLuong = SoLuong + ${quantity} 
                    WHERE MaGH = ${maGioHang} AND MaSach = ${bookId}
                `;
            } else {
                // Chưa có -> Thêm mới (Chỉ lưu MaGH, MaSach, SoLuong)
                // ⚠️ Đã bỏ cột DonGia để fix lỗi
                await transaction.request().query`
                    INSERT INTO GioHang_Sach (MaGH, MaSach, SoLuong) 
                    VALUES (${maGioHang}, ${bookId}, ${quantity})
                `;
            }

            // 4. Cập nhật lại "Tạm Tính" cho cả Giỏ Hàng
            // Logic: Tính tổng (SoLuong * GiaBan) của tất cả sách trong giỏ này
            await transaction.request().query`
                UPDATE GioHang 
                SET TamTinh = (
                    SELECT SUM(ghs.SoLuong * s.GiaBan)
                    FROM GioHang_Sach ghs
                    JOIN Sach s ON ghs.MaSach = s.MaSach
                    WHERE ghs.MaGH = ${maGioHang}
                )
                WHERE MaGH = ${maGioHang}
            `;

            await transaction.commit();
            console.log("✅ [PURCHASE] Thêm giỏ mua thành công!");
            res.json({ code: 200, message: 'Thêm vào giỏ mua thành công!' });

        } catch (error) {
            if (transaction._aborted === false) {
                try { await transaction.rollback(); } catch (e) {}
            }
            console.error('❌ Lỗi thêm giỏ mua:', error);
            res.status(500).json({ message: 'Lỗi hệ thống: ' + error.message });
        }
    },

    updatePurchaseCartItem: async (req, res) => {
        const transaction = new sql.Transaction();
        try {
            // 1. Lấy tham số (Hỗ trợ cả MaSach/maSach cho an toàn)
            const { maSach, MaSach, soLuong, SoLuong } = req.body;
            const bookId = MaSach || maSach;
            const quantity = parseInt(SoLuong || soLuong);
            const maDG = req.user.MaDG;

            if (!bookId) return res.status(400).json({ message: 'Thiếu mã sách.' });
            if (isNaN(quantity) || quantity < 1) return res.status(400).json({ message: 'Số lượng không hợp lệ' });

            await transaction.begin();

            // 2. Lấy Giỏ Hàng
            const gio = await transaction.request().query`SELECT MaGH FROM GioHang WHERE MaDG = ${maDG}`;
            if (!gio.recordset.length) { 
                await transaction.rollback(); 
                return res.status(404).json({ message: 'Không tìm thấy giỏ mua hàng.' }); 
            }
            const maGH = gio.recordset[0].MaGH;

            // 3. Kiểm tra sách có trong giỏ không
            const item = await transaction.request().query`SELECT * FROM GioHang_Sach WHERE MaGH = ${maGH} AND MaSach = ${bookId}`;
            if (!item.recordset.length) { 
                await transaction.rollback(); 
                return res.status(404).json({ message: 'Sách này không có trong giỏ.' }); 
            }

            // 4. Kiểm tra tồn kho
            const stock = await transaction.request().query`SELECT SoLuongTon FROM Sach WHERE MaSach = ${bookId}`;
            if (quantity > stock.recordset[0].SoLuongTon) {
                await transaction.rollback();
                return res.status(400).json({ message: `Không đủ hàng (Kho còn: ${stock.recordset[0].SoLuongTon}).` });
            }

            // 5. Cập nhật số lượng mới
            await transaction.request().query`
                UPDATE GioHang_Sach 
                SET SoLuong = ${quantity} 
                WHERE MaGH = ${maGH} AND MaSach = ${bookId}
            `;

            // 6. Tính lại Tạm Tính (FIX LỖI Ở ĐÂY)
            // Phải JOIN với bảng Sach để lấy GiaBan
            const cartTotal = await transaction.request().query`
                SELECT SUM(ghs.SoLuong * s.GiaBan) as NewTamTinh 
                FROM GioHang_Sach ghs
                JOIN Sach s ON ghs.MaSach = s.MaSach
                WHERE ghs.MaGH = ${maGH}
            `;
            
            const newTamTinh = cartTotal.recordset[0].NewTamTinh || 0;
            
            // Cập nhật lại bảng GioHang
            await transaction.request().query`UPDATE GioHang SET TamTinh = ${newTamTinh} WHERE MaGH = ${maGH}`;

            // Lấy tổng số lượng item để trả về (nếu cần hiển thị badge giỏ hàng)
            const countResult = await transaction.request().query`SELECT SUM(SoLuong) as TongSoLuong FROM GioHang_Sach WHERE MaGH = ${maGH}`;

            await transaction.commit();
            
            res.json({ 
                code: 200, 
                data: { 
                    tongSoLuongMoi: countResult.recordset[0].TongSoLuong, 
                    tamTinhMoi: newTamTinh 
                }, 
                message: 'Cập nhật giỏ hàng thành công.' 
            });

        } catch (error) {
            if (transaction._aborted === false) {
                try { await transaction.rollback(); } catch (e) {}
            }
            console.error('❌ Lỗi update giỏ mua:', error);
            res.status(500).json({ code: 500, message: 'Lỗi server: ' + error.message });
        }
    },

    removeFromPurchaseCart: async (req, res) => {
        const transaction = new sql.Transaction();
        try {
            const { maSach } = req.params;
            const maDG = req.user.MaDG;

            await transaction.begin();

            // 1. Lấy Giỏ Hàng
            const gio = await transaction.request().query`SELECT MaGH FROM GioHang WHERE MaDG = ${maDG}`;
            if (!gio.recordset.length) { 
                await transaction.rollback(); 
                return res.status(404).json({ message: 'Không tìm thấy giỏ.' }); 
            }
            const maGH = gio.recordset[0].MaGH;

            // 2. Xóa sách khỏi chi tiết giỏ
            await transaction.request().query`DELETE FROM GioHang_Sach WHERE MaGH = ${maGH} AND MaSach = ${maSach}`;

            // 3. Tính lại Tạm Tính (FIX LỖI Ở ĐÂY)
            // Phải JOIN với bảng Sach để lấy giá bán (GiaBan) thay vì DonGia ảo
            const cartTotal = await transaction.request().query`
                SELECT SUM(ghs.SoLuong * s.GiaBan) as NewTamTinh 
                FROM GioHang_Sach ghs
                JOIN Sach s ON ghs.MaSach = s.MaSach
                WHERE ghs.MaGH = ${maGH}
            `;
            const newTamTinh = cartTotal.recordset[0].NewTamTinh || 0;

            // 4. Cập nhật lại bảng GioHang
            await transaction.request().query`UPDATE GioHang SET TamTinh = ${newTamTinh} WHERE MaGH = ${maGH}`;

            // 5. Đếm lại tổng số lượng sách còn lại
            const countResult = await transaction.request().query`SELECT SUM(SoLuong) as TongSoLuong FROM GioHang_Sach WHERE MaGH = ${maGH}`;

            await transaction.commit();
            
            res.json({ 
                code: 200, 
                data: { 
                    tongSoLuongMoi: countResult.recordset[0].TongSoLuong || 0, 
                    tamTinhMoi: newTamTinh 
                }, 
                message: 'Xóa thành công.' 
            });

        } catch (error) {
            if (transaction._aborted === false) {
                try { await transaction.rollback(); } catch (e) {}
            }
            console.error('❌ Lỗi xóa giỏ mua:', error);
            res.status(500).json({ code: 500, message: 'Lỗi server: ' + error.message });
        }
    },

    clearPurchaseCart: async (req, res) => {
        const transaction = new sql.Transaction();
        try {
            const maDG = req.user.MaDG;
            
            await transaction.begin();

            // 1. Lấy mã Giỏ Hàng
            const gio = await transaction.request().query`SELECT MaGH FROM GioHang WHERE MaDG = ${maDG}`;
            
            if (gio.recordset.length) {
                const maGH = gio.recordset[0].MaGH;

                // 2. Xóa sạch chi tiết sách trong giỏ
                await transaction.request().query`DELETE FROM GioHang_Sach WHERE MaGH = ${maGH}`;

                // 3. Reset tổng tiền (TamTinh) về 0 thay vì xóa luôn giỏ
                // Giữ lại cái "vỏ" giỏ hàng để lần sau dùng tiếp
                await transaction.request().query`UPDATE GioHang SET TamTinh = 0 WHERE MaGH = ${maGH}`;
            }
            
            await transaction.commit();
            
            // Trả về 200 OK để Frontend dễ xử lý (hoặc 204 No Content)
            res.json({ code: 200, message: 'Giỏ hàng đã được làm trống.' });

        } catch (error) {
            if (transaction._aborted === false) {
                try { await transaction.rollback(); } catch (e) {}
            }
            console.error('❌ Lỗi clear giỏ mua:', error);
            res.status(500).json({ code: 500, message: 'Lỗi server: ' + error.message });
        }
    }
};

module.exports = cartController;