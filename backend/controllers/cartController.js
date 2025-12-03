const sql = require('mssql');

// ================================================================================
// ⚙️ CẤU HÌNH HỆ THỐNG (HARDCODED)
// ================================================================================
const SYSTEM_CONFIG = {
    NGUONG_TIEN_PHAT: 50000, // 50.000 VND
    MAX_MUON_TOI_DA: 5       // 5 cuốn sách
};

// ================================================================================
// 🔑 HÀM HELPER (HỖ TRỢ)
// ================================================================================

// 1. Tạo ID duy nhất (Tăng tự động dựa trên DB)
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

// 2. 🔥 TÍNH TOÁN LẠI TỔNG TIỀN GIỎ HÀNG (Dùng chung cho Add/Update/Remove)
const _recalculatePurchaseCart = async (transaction, maGH) => {
    // Tính tổng tiền dựa trên giá hiện tại trong bảng Sach
    const result = await transaction.request().query`
        SELECT SUM(ghs.SoLuong * ISNULL(s.GiaBan, 0)) as NewTamTinh, 
               SUM(ghs.SoLuong) as TongSL
        FROM GioHang_Sach ghs 
        JOIN Sach s ON ghs.MaSach = s.MaSach
        WHERE ghs.MaGH = ${maGH}
    `;
    
    const newTamTinh = result.recordset[0].NewTamTinh || 0;
    const tongSL = result.recordset[0].TongSL || 0;

    // Cập nhật ngược lại vào bảng GioHang
    await transaction.request().query`
        UPDATE GioHang SET TamTinh = ${newTamTinh} WHERE MaGH = ${maGH}
    `;

    return { newTamTinh, tongSL };
};

// ================================================================================
// 🎮 CONTROLLER CHÍNH
// ================================================================================
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

            if (!maDG) return res.status(401).json({ message: 'Lỗi: Token không hợp lệ.' });
            if (!bookId) return res.status(400).json({ message: 'Lỗi: Thiếu Mã Sách.' });

            await transaction.begin();

            // 1. Kiểm tra Độc giả
            const docGiaResult = await transaction.request().query`
                SELECT TrangThaiThe, TongPhatChuaThanhToan FROM DocGia WHERE MaDG = ${maDG}
            `;
            if (!docGiaResult.recordset.length) {
                await transaction.rollback(); return res.status(404).json({ message: `Không tìm thấy Độc giả.` });
            }
            const { TrangThaiThe, TongPhatChuaThanhToan } = docGiaResult.recordset[0];
            const statusClean = TrangThaiThe ? TrangThaiThe.replace(/\s/g, '').toLowerCase() : '';
            if (!['conhan', 'cònhạn', 'hoatdong', 'hoạtđộng'].includes(statusClean)) {
                await transaction.rollback(); return res.status(400).json({ message: `Thẻ độc giả không khả dụng.` });
            }
            if ((TongPhatChuaThanhToan || 0) > SYSTEM_CONFIG.NGUONG_TIEN_PHAT) {
                await transaction.rollback(); return res.status(400).json({ message: `Bạn đang nợ phạt quá hạn mức.` });
            }

            // 2. Kiểm tra Sách
            const sachResult = await transaction.request().query`
                SELECT MaSach, TenSach, SoLuongTon, TinhTrang FROM Sach WHERE MaSach = ${bookId}
            `;
            if (!sachResult.recordset.length) {
                await transaction.rollback(); return res.status(404).json({ message: `Sách không tồn tại.` });
            }
            const book = sachResult.recordset[0];
            const bookStatus = book.TinhTrang ? book.TinhTrang.trim().toLowerCase() : '';
            if (!['con', 'còn', 'san sang', 'sẵn sàng'].includes(bookStatus)) {
                await transaction.rollback(); return res.status(400).json({ message: `Sách '${book.TenSach}' hiện không khả dụng.` });
            }
            if (book.SoLuongTon < quantity) {
                await transaction.rollback(); return res.status(400).json({ message: `Kho không đủ số lượng.` });
            }

            // 3. Tính toán giới hạn
            const dangMuonResult = await transaction.request().query`
                SELECT COUNT(*) as SL_DangMuon FROM MuonSach ms 
                JOIN MuonSach_Sach mss ON ms.MaMuon = mss.MaMuon 
                WHERE ms.MaDG = ${maDG} AND ms.TrangThai NOT IN ('DaTraHet', 'DaHuy')
            `;
            const slDangMuon = dangMuonResult.recordset[0].SL_DangMuon || 0;

            let gioMuonResult = await transaction.request().query`SELECT MaGM, TongSoLuong FROM GioMuon WHERE MaDG = ${maDG}`;
            let maGioMuon;
            let slTrongGio = 0;

            if (!gioMuonResult.recordset.length) {
                const newMaGM = await getUniqueId(transaction.request(), "GM", "GioMuon", "MaGM");
                await transaction.request().query`INSERT INTO GioMuon (MaGM, MaDG, TongSoLuong, NgayTao) VALUES (${newMaGM}, ${maDG}, 0, GETDATE())`;
                maGioMuon = newMaGM;
            } else {
                maGioMuon = gioMuonResult.recordset[0].MaGM;
                slTrongGio = gioMuonResult.recordset[0].TongSoLuong || 0;
            }

            if ((slDangMuon + slTrongGio + quantity) > SYSTEM_CONFIG.MAX_MUON_TOI_DA) {
                await transaction.rollback();
                return res.status(400).json({ 
                    code: 400, message: `Vượt quá giới hạn mượn (${SYSTEM_CONFIG.MAX_MUON_TOI_DA} cuốn).`
                });
            }

            // 4. Thêm vào giỏ
            const existingItem = await transaction.request().query`SELECT * FROM GioMuon_Sach WHERE MaGM = ${maGioMuon} AND MaSach = ${bookId}`;
            if (existingItem.recordset.length > 0) {
                await transaction.request().query`UPDATE GioMuon_Sach SET SoLuong = SoLuong + ${quantity} WHERE MaGM = ${maGioMuon} AND MaSach = ${bookId}`;
            } else {
                await transaction.request().query`INSERT INTO GioMuon_Sach (MaGM, MaSach, SoLuong) VALUES (${maGioMuon}, ${bookId}, ${quantity})`;
            }

            // 5. Cập nhật tổng
            await transaction.request().query`
                UPDATE GioMuon SET TongSoLuong = (SELECT SUM(SoLuong) FROM GioMuon_Sach WHERE MaGM = ${maGioMuon}) WHERE MaGM = ${maGioMuon}
            `;

            await transaction.commit();
            res.json({ code: 200, message: 'Thêm vào giỏ mượn thành công!' });

        } catch (error) {
            if (transaction._aborted === false) try { await transaction.rollback(); } catch (e) {}
            console.error('❌ Lỗi addToLoanCart:', error);
            res.status(500).json({ message: 'Lỗi hệ thống: ' + error.message });
        }
    },

    updateLoanCartItem: async (req, res) => {
        const transaction = new sql.Transaction();
        try {
            const { maSach, MaSach, soLuong, SoLuong } = req.body;
            const bookId = MaSach || maSach;
            const newQty = parseInt(SoLuong || soLuong);
            const maDG = req.user.MaDG;

            // 🔥 TỰ ĐỘNG XÓA NẾU SL <= 0
            if (newQty <= 0) {
                // Chúng ta sẽ gọi hàm remove nhưng phải xử lý req/res phù hợp. 
                // Cách tốt nhất là tái sử dụng logic remove ở đây hoặc gọi hàm remove trực tiếp nếu cấu trúc cho phép.
                // Để an toàn trong transaction này, ta tự viết logic xóa ở dưới.
            } else {
                if (isNaN(newQty)) return res.status(400).json({ message: 'Số lượng không hợp lệ.' });
            }

            await transaction.begin();

            const gio = await transaction.request().query`SELECT MaGM FROM GioMuon WHERE MaDG = ${maDG}`;
            if (!gio.recordset.length) { await transaction.rollback(); return res.status(404).json({ message: 'Không tìm thấy giỏ mượn.' }); }
            const maGM = gio.recordset[0].MaGM;

            // Logic Xóa nếu SL <= 0
            if (newQty <= 0) {
                await transaction.request().query`DELETE FROM GioMuon_Sach WHERE MaGM = ${maGM} AND MaSach = ${bookId}`;
                await transaction.request().query`UPDATE GioMuon SET TongSoLuong = (SELECT ISNULL(SUM(SoLuong), 0) FROM GioMuon_Sach WHERE MaGM = ${maGM}) WHERE MaGM = ${maGM}`;
                const finalTotal = await transaction.request().query`SELECT TongSoLuong FROM GioMuon WHERE MaGM = ${maGM}`;
                await transaction.commit();
                return res.json({ code: 200, data: { tongSoLuongMoi: finalTotal.recordset[0].TongSoLuong }, message: 'Đã xóa sách khỏi giỏ.' });
            }

            // Logic Update
            const item = await transaction.request().query`SELECT SoLuong FROM GioMuon_Sach WHERE MaGM = ${maGM} AND MaSach = ${bookId}`;
            if (!item.recordset.length) { await transaction.rollback(); return res.status(404).json({ message: 'Sách không có trong giỏ.' }); }
            
            const oldQty = item.recordset[0].SoLuong;
            const diff = newQty - oldQty;

            const stock = await transaction.request().query`SELECT SoLuongTon FROM Sach WHERE MaSach = ${bookId}`;
            if (newQty > stock.recordset[0].SoLuongTon) {
                await transaction.rollback(); return res.status(400).json({ message: `Không đủ tồn kho (Còn: ${stock.recordset[0].SoLuongTon}).` });
            }

            // Check giới hạn
            const dangMuonResult = await transaction.request().query`
                SELECT COUNT(*) as SL_DangMuon FROM MuonSach ms JOIN MuonSach_Sach mss ON ms.MaMuon = mss.MaMuon 
                WHERE ms.MaDG = ${maDG} AND ms.TrangThai NOT IN ('DaTraHet', 'DaHuy')
            `;
            const slDangMuon = dangMuonResult.recordset[0].SL_DangMuon || 0;
            const cartTotalResult = await transaction.request().query`SELECT TongSoLuong FROM GioMuon WHERE MaGM = ${maGM}`;
            const currentCartTotal = cartTotalResult.recordset[0].TongSoLuong || 0;

            if ((slDangMuon + currentCartTotal + diff) > SYSTEM_CONFIG.MAX_MUON_TOI_DA) {
                await transaction.rollback();
                return res.status(400).json({ code: 400, message: `Vượt quá giới hạn mượn.` });
            }

            await transaction.request().query`UPDATE GioMuon_Sach SET SoLuong = ${newQty} WHERE MaGM = ${maGM} AND MaSach = ${bookId}`;
            await transaction.request().query`UPDATE GioMuon SET TongSoLuong = (SELECT SUM(SoLuong) FROM GioMuon_Sach WHERE MaGM = ${maGM}) WHERE MaGM = ${maGM}`;
            const newTotalResult = await transaction.request().query`SELECT TongSoLuong FROM GioMuon WHERE MaGM = ${maGM}`;

            await transaction.commit();
            res.json({ code: 200, data: { tongSoLuongMoi: newTotalResult.recordset[0].TongSoLuong }, message: 'Cập nhật thành công.' });

        } catch (error) {
            if (transaction._aborted === false) try { await transaction.rollback(); } catch (e) {}
            console.error('❌ Lỗi update giỏ mượn:', error);
            res.status(500).json({ message: 'Lỗi hệ thống: ' + error.message });
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

            await transaction.request().query`DELETE FROM GioMuon_Sach WHERE MaGM = ${maGM} AND MaSach = ${maSach}`;
            await transaction.request().query`UPDATE GioMuon SET TongSoLuong = (SELECT ISNULL(SUM(SoLuong), 0) FROM GioMuon_Sach WHERE MaGM = ${maGM}) WHERE MaGM = ${maGM}`;
            const newTotal = await transaction.request().query`SELECT TongSoLuong FROM GioMuon WHERE MaGM = ${maGM}`;

            await transaction.commit();
            res.json({ code: 200, data: { tongSoLuongMoi: newTotal.recordset[0].TongSoLuong }, message: 'Xóa thành công.' });
        } catch (error) {
            if (transaction._aborted === false) try { await transaction.rollback(); } catch (e) {}
            res.status(500).json({ message: 'Lỗi server.' });
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
            if (transaction._aborted === false) try { await transaction.rollback(); } catch (e) {}
            res.status(500).json({ message: 'Lỗi server.' });
        }
    },

    // ================================================================================
    // 🛍️ GIỎ MUA SÁCH (PURCHASE CART)
    // ================================================================================

    getPurchaseCart: async (req, res) => {
        try {
            const maDG = req.user.MaDG;
            const gioHangResult = await sql.query`SELECT MaGH, MaDG, TamTinh FROM GioHang WHERE MaDG = ${maDG}`;

            if (!gioHangResult.recordset.length) {
                return res.json({ code: 200, data: { maGH: null, maDG: maDG, tamTinh: 0, chiTiet: [] } });
            }

            const maGioHang = gioHangResult.recordset[0].MaGH; 
            
            // 🔥 TỐI ƯU QUERY: Kiểm tra trạng thái sách
            const chiTietResult = await sql.query`
                SELECT 
                    ghs.MaSach, s.TenSach, s.AnhMinhHoa, 
                    ghs.SoLuong as soLuongMua, 
                    s.GiaBan as donGia,
                    s.SoLuongTon as tonKho,
                    (ghs.SoLuong * ISNULL(s.GiaBan, 0)) as thanhTien,
                    CASE WHEN ghs.SoLuong > s.SoLuongTon THEN 1 ELSE 0 END as isHetHang,
                    CASE WHEN s.GiaBan IS NULL OR s.GiaBan <= 0 THEN 1 ELSE 0 END as isNgungKinhDoanh
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

            if (!maDG) return res.status(401).json({ message: 'Lỗi: Token không hợp lệ.' });
            if (!bookId) return res.status(400).json({ message: 'Lỗi: Thiếu Mã Sách.' });

            await transaction.begin();
            
            // 1. Kiểm tra sách
            const sachResult = await transaction.request().query`SELECT MaSach, TenSach, GiaBan, SoLuongTon FROM Sach WHERE MaSach = ${bookId}`;
            if (!sachResult.recordset.length) {
                await transaction.rollback(); return res.status(404).json({ message: `Sách không tồn tại.` });
            }
            const book = sachResult.recordset[0];
            if (!book.GiaBan || book.GiaBan <= 0) {
                await transaction.rollback(); return res.status(400).json({ message: `Sách này không bán.` });
            }
            if (book.SoLuongTon < quantity) {
                await transaction.rollback(); return res.status(400).json({ message: `Kho không đủ hàng.` });
            }

            // 2. Lấy/Tạo Giỏ
            let gioHangResult = await transaction.request().query`SELECT MaGH FROM GioHang WHERE MaDG = ${maDG}`;
            let maGioHang;
            if (!gioHangResult.recordset.length) {
                const newMaGH = await getUniqueId(transaction.request(), "GH", "GioHang", "MaGH");
                await transaction.request().query`INSERT INTO GioHang (MaGH, MaDG, TamTinh) VALUES (${newMaGH}, ${maDG}, 0)`;
                maGioHang = newMaGH;
            } else {
                maGioHang = gioHangResult.recordset[0].MaGH;
            }

            // 3. Thêm vào chi tiết (Không lưu Đơn giá)
            const existingItem = await transaction.request().query`SELECT * FROM GioHang_Sach WHERE MaGH = ${maGioHang} AND MaSach = ${bookId}`;
            if (existingItem.recordset.length > 0) {
                await transaction.request().query`UPDATE GioHang_Sach SET SoLuong = SoLuong + ${quantity} WHERE MaGH = ${maGioHang} AND MaSach = ${bookId}`;
            } else {
                await transaction.request().query`INSERT INTO GioHang_Sach (MaGH, MaSach, SoLuong) VALUES (${maGioHang}, ${bookId}, ${quantity})`;
            }

            // 4. 🔥 DÙNG HELPER ĐỂ TÍNH TIỀN
            await _recalculatePurchaseCart(transaction, maGioHang);

            await transaction.commit();
            res.json({ code: 200, message: 'Thêm vào giỏ thành công!' });

        } catch (error) {
            if (transaction._aborted === false) try { await transaction.rollback(); } catch (e) {}
            console.error('❌ Lỗi thêm giỏ mua:', error);
            res.status(500).json({ message: 'Lỗi hệ thống: ' + error.message });
        }
    },

    updatePurchaseCartItem: async (req, res) => {
        const transaction = new sql.Transaction();
        try {
            const { maSach, MaSach, soLuong, SoLuong } = req.body;
            const bookId = MaSach || maSach;
            const quantity = parseInt(SoLuong || soLuong);
            const maDG = req.user.MaDG;

            if (!bookId) return res.status(400).json({ message: 'Thiếu mã sách.' });

            await transaction.begin();
            const gio = await transaction.request().query`SELECT MaGH FROM GioHang WHERE MaDG = ${maDG}`;
            if (!gio.recordset.length) { await transaction.rollback(); return res.status(404).json({ message: 'Không tìm thấy giỏ.' }); }
            const maGH = gio.recordset[0].MaGH;

            // 🔥 TỰ ĐỘNG XÓA NẾU SỐ LƯỢNG <= 0
            if (quantity <= 0) {
                await transaction.request().query`DELETE FROM GioHang_Sach WHERE MaGH = ${maGH} AND MaSach = ${bookId}`;
                // Tính lại tiền sau khi xóa
                const result = await _recalculatePurchaseCart(transaction, maGH);
                await transaction.commit();
                return res.json({ 
                    code: 200, 
                    data: { tongSoLuongMoi: result.tongSL, tamTinhMoi: result.newTamTinh }, 
                    message: 'Đã xóa sách khỏi giỏ.' 
                });
            }

            // Logic Update bình thường
            const item = await transaction.request().query`SELECT * FROM GioHang_Sach WHERE MaGH = ${maGH} AND MaSach = ${bookId}`;
            if (!item.recordset.length) { await transaction.rollback(); return res.status(404).json({ message: 'Sách không có trong giỏ.' }); }

            const stock = await transaction.request().query`SELECT SoLuongTon FROM Sach WHERE MaSach = ${bookId}`;
            if (quantity > stock.recordset[0].SoLuongTon) {
                await transaction.rollback(); return res.status(400).json({ message: `Không đủ hàng (Kho còn: ${stock.recordset[0].SoLuongTon}).` });
            }

            await transaction.request().query`UPDATE GioHang_Sach SET SoLuong = ${quantity} WHERE MaGH = ${maGH} AND MaSach = ${bookId}`;
            
            // 4. 🔥 DÙNG HELPER ĐỂ TÍNH TIỀN
            const result = await _recalculatePurchaseCart(transaction, maGH);

            await transaction.commit();
            res.json({ 
                code: 200, 
                data: { tongSoLuongMoi: result.tongSL, tamTinhMoi: result.newTamTinh }, 
                message: 'Cập nhật thành công.' 
            });

        } catch (error) {
            if (transaction._aborted === false) try { await transaction.rollback(); } catch (e) {}
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
            const gio = await transaction.request().query`SELECT MaGH FROM GioHang WHERE MaDG = ${maDG}`;
            if (!gio.recordset.length) { await transaction.rollback(); return res.status(404).json({ message: 'Không tìm thấy giỏ.' }); }
            const maGH = gio.recordset[0].MaGH;

            await transaction.request().query`DELETE FROM GioHang_Sach WHERE MaGH = ${maGH} AND MaSach = ${maSach}`;

            // 4. 🔥 DÙNG HELPER ĐỂ TÍNH TIỀN
            const result = await _recalculatePurchaseCart(transaction, maGH);

            await transaction.commit();
            res.json({ 
                code: 200, 
                data: { tongSoLuongMoi: result.tongSL, tamTinhMoi: result.newTamTinh }, 
                message: 'Xóa thành công.' 
            });

        } catch (error) {
            if (transaction._aborted === false) try { await transaction.rollback(); } catch (e) {}
            console.error('❌ Lỗi xóa giỏ mua:', error);
            res.status(500).json({ code: 500, message: 'Lỗi server: ' + error.message });
        }
    },

    clearPurchaseCart: async (req, res) => {
        const transaction = new sql.Transaction();
        try {
            const maDG = req.user.MaDG;
            await transaction.begin();
            const gio = await transaction.request().query`SELECT MaGH FROM GioHang WHERE MaDG = ${maDG}`;
            if (gio.recordset.length) {
                const maGH = gio.recordset[0].MaGH;
                await transaction.request().query`DELETE FROM GioHang_Sach WHERE MaGH = ${maGH}`;
                await transaction.request().query`UPDATE GioHang SET TamTinh = 0 WHERE MaGH = ${maGH}`;
            }
            await transaction.commit();
            res.json({ code: 200, message: 'Giỏ hàng đã được làm trống.' });
        } catch (error) {
            if (transaction._aborted === false) try { await transaction.rollback(); } catch (e) {}
            console.error('❌ Lỗi clear giỏ mua:', error);
            res.status(500).json({ code: 500, message: 'Lỗi server: ' + error.message });
        }
    }
};

module.exports = cartController;