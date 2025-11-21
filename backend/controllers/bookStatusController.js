const sql = require("mssql");
const config = require("../db/dbConfig");
const { getUniqueId } = require("../utils/dbUtils");

// ============================================================
// 1. LẤY DANH SÁCH BẢN SAO CỦA 1 ĐẦU SÁCH
// ============================================================
exports.getCopiesByBook = async (req, res) => {
    try {
        const { maSach } = req.params;
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input("MaSach", sql.VarChar(10), maSach)
            .query(`
                SELECT * FROM BanSao_ThuVien 
                WHERE MaSach = @MaSach 
                ORDER BY MaBanSao ASC
            `);
        
        res.status(200).json({ code: 200, data: result.recordset });
    } catch (error) {
        console.error("Lỗi lấy bản sao:", error);
        res.status(500).json({ message: "Lỗi lấy danh sách bản sao." });
    }
};

// ============================================================
// 2. NHẬP KHO (Tạo bản sao + Tăng tồn kho)
// ============================================================
exports.generateCopies = async (req, res) => {
    const { maSach, soLuongNhap, viTriKe } = req.body;
    
    if (!soLuongNhap || soLuongNhap < 1) {
        return res.status(400).json({ message: "Số lượng nhập phải lớn hơn 0." });
    }

    const transaction = new sql.Transaction();
    try {
        await transaction.begin(); // 🟢 Bắt đầu giao dịch
        const createdCodes = [];

        // A. Tạo từng bản sao vào bảng BanSao_ThuVien
        for (let i = 0; i < soLuongNhap; i++) {
            // Tạo mã bản sao: BS + Timestamp + Random
            const maBanSao = await getUniqueId(transaction, "BS", "BanSao_ThuVien", "MaBanSao");
            
            await transaction.request()
                .input("MaBanSao", sql.VarChar(15), maBanSao)
                .input("MaSach", sql.VarChar(10), maSach)
                .input("ViTriKe", sql.NVarChar(20), viTriKe || "Kho chính")
                .input("TrangThai", sql.NVarChar(50), "SanSang") // Mặc định là Sẵn sàng
                .query(`
                    INSERT INTO BanSao_ThuVien (MaBanSao, MaSach, ViTriKe, TrangThaiBanSao)
                    VALUES (@MaBanSao, @MaSach, @ViTriKe, @TrangThai)
                `);
            
            createdCodes.push(maBanSao);
        }

        // B. Cập nhật lại tổng tồn kho & Trạng thái "Còn"
        await transaction.request()
            .input("MaSach", sql.VarChar(10), maSach)
            .input("SoLuongThem", sql.Int, soLuongNhap)
            .query(`
                UPDATE Sach 
                SET SoLuongTon = SoLuongTon + @SoLuongThem,
                    TinhTrang = 'Còn'
                WHERE MaSach = @MaSach
            `);

        await transaction.commit(); // ✅ Lưu thay đổi
        
        res.status(201).json({ 
            code: 200, 
            message: `Đã nhập thêm ${soLuongNhap} bản sao thành công!`,
            data: createdCodes 
        });

    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback(); // ❌ Hoàn tác nếu lỗi
        console.error("Lỗi nhập bản sao:", error);
        res.status(500).json({ message: "Lỗi server khi nhập kho." });
    }
};

// ============================================================
// 3. CẬP NHẬT TRẠNG THÁI BẢN SAO (Hỏng/Mất/Thanh lý)
// ============================================================
exports.updateCopyStatus = async (req, res) => {
    try {
        const { maBanSao } = req.params;
        const { trangThai, viTriKe } = req.body;

        const pool = await sql.connect(config);
        const request = pool.request()
            .input("MaBanSao", sql.VarChar(15), maBanSao)
            .input("TrangThai", sql.NVarChar(50), trangThai);

        let query = `UPDATE BanSao_ThuVien SET TrangThaiBanSao = @TrangThai`;
        
        if (viTriKe) {
            query += `, ViTriKe = @ViTriKe`;
            request.input("ViTriKe", sql.NVarChar(20), viTriKe);
        }
        
        query += ` WHERE MaBanSao = @MaBanSao`;

        await request.query(query);

        res.status(200).json({ code: 200, message: "Cập nhật trạng thái thành công." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi cập nhật bản sao." });
    }
};

// ============================================================
// 4. XÓA BẢN SAO (Giảm tồn kho & Set 'Hết' nếu cần)
// ============================================================
exports.deleteCopy = async (req, res) => {
    try {
        const { maBanSao } = req.params;
        const pool = await sql.connect(config);
        
        // 1. Kiểm tra bản sao có tồn tại không để lấy MaSach
        const check = await pool.request()
            .input("MaBanSao", sql.VarChar(15), maBanSao)
            .query("SELECT MaSach FROM BanSao_ThuVien WHERE MaBanSao = @MaBanSao");
            
        if (check.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản sao." });
        }
        
        const maSach = check.recordset[0].MaSach;

        const transaction = new sql.Transaction(pool);
        await transaction.begin(); // 🟢 Bắt đầu giao dịch

        // 2. Xóa bản sao
        await transaction.request()
            .input("MaBanSao", sql.VarChar(15), maBanSao)
            .query("DELETE FROM BanSao_ThuVien WHERE MaBanSao = @MaBanSao");

        // 3. Trừ tồn kho ở bảng Sach
        await transaction.request()
            .input("MaSach", sql.VarChar(10), maSach)
            .query(`
                UPDATE Sach 
                SET SoLuongTon = CASE WHEN SoLuongTon > 0 THEN SoLuongTon - 1 ELSE 0 END
                WHERE MaSach = @MaSach
            `);
            
        // 4. 🔥 TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI NẾU HẾT SÁCH
        await transaction.request()
            .input("MaSach", sql.VarChar(10), maSach)
            .query(`
                UPDATE Sach 
                SET TinhTrang = 'Hết' 
                WHERE MaSach = @MaSach AND SoLuongTon <= 0
            `);

        await transaction.commit(); // ✅ Lưu thay đổi
        res.status(200).json({ code: 200, message: "Đã xóa bản sao và cập nhật kho." });

    } catch (error) {
        // Lỗi 547: Ràng buộc khóa ngoại (Sách đang được mượn hoặc có trong lịch sử trả)
        if (error.number === 547) {
            return res.status(409).json({ message: "Không thể xóa: Bản sao này đang được mượn hoặc có trong lịch sử giao dịch." });
        }
        console.error("Lỗi xóa bản sao:", error);
        res.status(500).json({ message: "Lỗi xóa bản sao." });
    }
};