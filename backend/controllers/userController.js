// controllers/userController.js
const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const config = require('../db/dbConfig');

// ============================================================
// HÀM HỖ TRỢ: TẠO ID DUY NHẤT (Tái sử dụng)
// ============================================================
const getUniqueId = async (pool, prefix, tableName, idColumn) => {
    let newId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!isUnique && attempts < maxAttempts) {
        // ID 10 ký tự (Prefix + 6 timestamp + 2 ngẫu nhiên)
        newId = `${prefix}${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
        
        const checkResult = await pool.request()
            .input('newId', sql.VarChar, newId)
            .query(`SELECT 1 FROM ${tableName} WHERE ${idColumn} = @newId`);

        if (checkResult.recordset.length === 0) {
            isUnique = true;
        }
        attempts++;
    }
    if (!isUnique) {
        throw new Error(`Không thể tạo ID duy nhất cho ${tableName}`);
    }
    return newId;
};


// ============================================================
// A. QUẢN LÝ ĐỘC GIẢ (CRUD)
// ============================================================

// Lấy danh sách tất cả độc giả
exports.getAllDocGia = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT 
                DG.MaDG, DG.HoTen, DG.Email, DG.SDT, DG.DiaChi, DG.TrangThaiThe, 
                DG.TongPhatChuaThanhToan, -- Đã thêm: Cột mới từ Database Schema
                TK.TenDangNhap, TK.TrangThai AS TaiKhoanTrangThai,
                (SELECT COUNT(*) FROM MuonSach MS WHERE MS.MaDG = DG.MaDG AND MS.TrangThai IN (N'DangMuon', N'QuaHan')) AS SoSachDangMuon,
                CASE 
                    WHEN EXISTS (SELECT 1 FROM MuonSach MS WHERE MS.MaDG = DG.MaDG AND MS.TrangThai = N'QuaHan') THEN N'Quá hạn trả'
                    WHEN EXISTS (SELECT 1 FROM MuonSach MS WHERE MS.MaDG = DG.MaDG AND MS.TrangThai = N'DangMuon') THEN N'Đang mượn'
                    ELSE N'Không mượn'
                END AS TrangThaiMuon
            FROM DocGia DG
            JOIN TaiKhoan TK ON DG.MaTK = TK.MaTK
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi lấy danh sách độc giả:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách độc giả.' });
    }
};

// Lấy thông tin độc giả theo ID
exports.getDocGiaById = async (req, res) => {
    const { MaDG } = req.params;
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('MaDG', sql.VarChar, MaDG)
            .query(`
                SELECT 
                    DG.MaDG, DG.HoTen, DG.Email, DG.SDT, DG.DiaChi, DG.TrangThaiThe, DG.NgayHetHanThe,
                    DG.TongPhatChuaThanhToan, -- Đã thêm: Cột mới từ Database Schema
                    TK.TenDangNhap, TK.TrangThai AS TaiKhoanTrangThai
                FROM DocGia DG
                JOIN TaiKhoan TK ON DG.MaTK = TK.MaTK
                WHERE DG.MaDG = @MaDG
                -- Đã xóa DG.NgaySinh vì cột này không tồn tại trong Database Schema
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy độc giả.' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Lỗi lấy độc giả theo ID:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy thông tin độc giả.' });
    }
};

// Thêm độc giả mới
exports.addDocGia = async (req, res) => {
    const { HoTen, Email, MatKhau, SDT, DiaChi, TenDangNhap } = req.body;

    if (!HoTen || !MatKhau || !TenDangNhap) {
        return res.status(400).json({ message: 'Họ tên, Tên đăng nhập và Mật khẩu là bắt buộc.' });
    }

    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = transaction.request();

        const check = await request
            .input('TenDangNhap', sql.VarChar, TenDangNhap)
            .input('Email', sql.VarChar, Email || null)
            .query(`
                SELECT 1 FROM TaiKhoan WHERE TenDangNhap = @TenDangNhap
                ${Email ? 'UNION ALL SELECT 1 FROM DocGia WHERE Email = @Email' : ''}
            `);

        if (check.recordset.length > 0) {
            await transaction.rollback();
            return res.status(409).json({ message: 'Tên đăng nhập hoặc Email đã được sử dụng.' });
        }

        const hashed = await bcrypt.hash(MatKhau, 10);
        const MaTK = await getUniqueId(pool, 'TK', 'TaiKhoan', 'MaTK');
        const MaDG = await getUniqueId(pool, 'DG', 'DocGia', 'MaDG');
        
        await request
            .input('MaTK', sql.VarChar, MaTK)
            .input('TenDangNhap_Ins', sql.VarChar, TenDangNhap)
            .input('MatKhau_Ins', sql.VarChar, hashed)
            .query("INSERT INTO TaiKhoan (MaTK, TenDangNhap, MatKhau, LoaiTK) VALUES (@MaTK, @TenDangNhap_Ins, @MatKhau_Ins, 'DocGia')");

        const NgayHetHanThe = new Date();
        NgayHetHanThe.setFullYear(NgayHetHanThe.getFullYear() + 1); 

        await request
            .input('MaDG', sql.VarChar, MaDG)
            .input('HoTen', sql.NVarChar, HoTen)
            .input('Email_Ins', sql.VarChar, Email || null)
            .input('SDT', sql.VarChar, SDT || null)
            .input('DiaChi', sql.NVarChar, DiaChi || null)
            .input('NgayHetHanThe', sql.Date, NgayHetHanThe)
            .input('MaTK_DG', sql.VarChar, MaTK)
            .input('TongPhatChuaThanhToan', sql.Decimal, 0) // Đã thêm: Khởi tạo bằng 0
            .query(`
                INSERT INTO DocGia (
                    MaDG, HoTen, Email, SDT, DiaChi, NgayHetHanThe, MaTK, 
                    TrangThaiThe, TongPhatChuaThanhToan
                ) 
                VALUES (
                    @MaDG, @HoTen, @Email_Ins, @SDT, @DiaChi, @NgayHetHanThe, @MaTK_DG, 
                    N'ConHan', -- Đã sửa: dùng giá trị chuẩn N'ConHan'
                    @TongPhatChuaThanhToan
                )
            `);
            
        await transaction.commit();
        res.status(201).json({ message: 'Thêm độc giả thành công.', MaDG });
        
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Lỗi thêm độc giả:', err);
        res.status(500).json({ message: 'Lỗi server khi thêm độc giả.' });
    }
};

// Cập nhật thông tin độc giả
exports.updateDocGia = async (req, res) => {
    const { MaDG } = req.params;
    const { HoTen, SDT, DiaChi, Email } = req.body; 
    
    try {
        const pool = await sql.connect(config);
        const request = pool.request();

        await request
            .input('MaDG', sql.VarChar, MaDG)
            .input('HoTen', sql.NVarChar, HoTen)
            .input('SDT', sql.VarChar, SDT)
            .input('DiaChi', sql.NVarChar, DiaChi)
            .input('Email', sql.VarChar, Email) 
            .query(`
                UPDATE DocGia SET 
                    HoTen = @HoTen, 
                    SDT = @SDT, 
                    DiaChi = @DiaChi,
                    Email = @Email
                WHERE MaDG = @MaDG
            `);

        res.json({ message: 'Cập nhật thông tin độc giả thành công.' });
    } catch (err) {
        console.error('Lỗi cập nhật độc giả:', err);
        res.status(500).json({ message: 'Lỗi server khi cập nhật độc giả.' });
    }
};

// Cập nhật trạng thái thẻ độc giả (Khóa/Mở)
exports.updateDocGiaStatus = async (req, res) => {
    const { MaDG } = req.params;
    // Giả định client gửi N'ConHan', N'ChoKichHoat' hoặc các giá trị khác
    const { TrangThaiThe } = req.body; 

    if (!TrangThaiThe) {
        return res.status(400).json({ message: 'TrangThaiThe là bắt buộc.' });
    }
    
    // Ánh xạ trạng thái thẻ (Ví dụ: N'ConHan' -> HoatDong, N'BiKhoa' -> BiKhoa)
    // Giữ logic ban đầu, giả định client gửi trạng thái hoạt động dưới dạng N'Hoạt động'
    const TaiKhoanTrangThai = (TrangThaiThe === 'Hoạt động' || TrangThaiThe === 'ConHan') ? 'HoatDong' : 'BiKhoa';
    
    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = transaction.request();

        await request
            .input('MaDG', sql.VarChar, MaDG)
            .input('TrangThaiThe', sql.NVarChar, TrangThaiThe)
            .query('UPDATE DocGia SET TrangThaiThe = @TrangThaiThe WHERE MaDG = @MaDG');

        const tkResult = await request
            .input('MaDG_TK', sql.VarChar, MaDG)
            .query('SELECT MaTK FROM DocGia WHERE MaDG = @MaDG_TK');
        
        if (tkResult.recordset.length > 0) {
            const MaTK = tkResult.recordset[0].MaTK;
            await request
                .input('MaTK', sql.VarChar, MaTK)
                .input('TaiKhoanTrangThai', sql.VarChar, TaiKhoanTrangThai) // Đã sửa: dùng sql.VarChar cho TaiKhoan.TrangThai
                .query('UPDATE TaiKhoan SET TrangThai = @TaiKhoanTrangThai WHERE MaTK = @MaTK');
        }

        await transaction.commit();
        res.json({ message: 'Cập nhật trạng thái thẻ thành công.' });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Lỗi cập nhật trạng thái thẻ:', err);
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái.' });
    }
};

// ============================================================
// B. QUẢN LÝ THỦ THƯ (CRUD)
// ============================================================

// Lấy danh sách tất cả thủ thư
exports.getAllThuThu = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT 
                TT.MaTT, TT.HoTen, TT.Email, TT.SDT, TT.Role,
                TK.TenDangNhap, TK.TrangThai AS TaiKhoanTrangThai
            FROM ThuThu TT
            JOIN TaiKhoan TK ON TT.MaTK = TK.MaTK
            -- Đã xóa ORDER BY TT.NgayTao DESC vì cột này không tồn tại
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi lấy danh sách thủ thư:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách thủ thư.' });
    }
};

// Thêm thủ thư/Admin mới
exports.addThuThu = async (req, res) => {
    const { HoTen, Email, MatKhau, SDT, Role, TenDangNhap } = req.body;
    
    if (!HoTen || !Email || !MatKhau || !Role || !TenDangNhap) {
        return res.status(400).json({ message: 'Vui lòng điền đủ thông tin bắt buộc.' });
    }
    
    if (!['ThuThu', 'Admin'].includes(Role)) {
        return res.status(400).json({ message: 'Vai trò không hợp lệ.' });
    }

    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = transaction.request();
        
        const check = await request
            .input('TenDangNhap', sql.VarChar, TenDangNhap)
            .input('Email', sql.VarChar, Email)
            .query(`
                SELECT MaTK FROM TaiKhoan WHERE TenDangNhap = @TenDangNhap
                UNION ALL
                SELECT MaTT FROM ThuThu WHERE Email = @Email
            `);

        if (check.recordset.length > 0) {
            await transaction.rollback();
            return res.status(409).json({ message: 'Tên đăng nhập hoặc Email đã được sử dụng.' });
        }

        const hashed = await bcrypt.hash(MatKhau, 10);
        const MaTK = await getUniqueId(pool, 'TK', 'TaiKhoan', 'MaTK');
        const MaTT = await getUniqueId(pool, 'TT', 'ThuThu', 'MaTT');
        
        await request
            .input('MaTK', sql.VarChar, MaTK)
            .input('TenDangNhap_Ins', sql.VarChar, TenDangNhap)
            .input('MatKhau', sql.VarChar, hashed)
            .input('LoaiTK', sql.VarChar, Role === 'Admin' ? 'Admin' : 'ThuThu')
            .query("INSERT INTO TaiKhoan (MaTK, TenDangNhap, MatKhau, LoaiTK, TrangThai) VALUES (@MaTK, @TenDangNhap_Ins, @MatKhau, @LoaiTK, 'HoatDong')");

        await request
            .input('MaTT', sql.VarChar, MaTT)
            .input('HoTen', sql.NVarChar, HoTen)
            .input('SDT', sql.VarChar, SDT || null)
            .input('Email_Ins', sql.VarChar, Email)
            .input('Role', sql.NVarChar, Role)
            .input('MaTK_TT', sql.VarChar, MaTK)
            .query(`
                INSERT INTO ThuThu (MaTT, HoTen, Email, SDT, Role, MaTK) 
                VALUES (@MaTT, @HoTen, @Email_Ins, @SDT, @Role, @MaTK_TT)
                -- Đã xóa NgayTao vì cột này không tồn tại
            `);
            
        await transaction.commit();
        res.status(201).json({ message: `Thêm ${Role} thành công.`, MaTT });
        
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Lỗi thêm thủ thư/admin:', err);
        res.status(500).json({ message: 'Lỗi server khi thêm thủ thư/admin.' });
    }
};

// Cập nhật thông tin thủ thư/Admin
exports.updateThuThu = async (req, res) => {
    const { MaTT } = req.params;
    const { HoTen, SDT, Role, MatKhauMoi, TaiKhoanTrangThai, Email } = req.body; 
    
    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = transaction.request();

        await request
            .input('MaTT', sql.VarChar, MaTT)
            .input('HoTen', sql.NVarChar, HoTen)
            .input('SDT', sql.VarChar, SDT)
            .input('Email', sql.VarChar, Email)
            .input('Role', sql.NVarChar, Role)
            .query('UPDATE ThuThu SET HoTen = @HoTen, SDT = @SDT, Role = @Role, Email = @Email WHERE MaTT = @MaTT');
            
        const tkResult = await request
            .input('MaTT_TK', sql.VarChar, MaTT)
            .query('SELECT MaTK FROM ThuThu WHERE MaTT = @MaTT_TK');
        
        if (tkResult.recordset.length > 0) {
            const MaTK = tkResult.recordset[0].MaTK;
            
            let updateTKQuery = 'UPDATE TaiKhoan SET LoaiTK = @LoaiTK, TrangThai = @TaiKhoanTrangThai ';
            request.input('LoaiTK', sql.VarChar, Role === 'Admin' ? 'Admin' : 'ThuThu'); // Đã sửa: Map Role sang LoaiTK
            request.input('TaiKhoanTrangThai', sql.VarChar, TaiKhoanTrangThai); // Đã sửa: dùng sql.VarChar cho TaiKhoan.TrangThai

            if (MatKhauMoi) {
                const hashed = await bcrypt.hash(MatKhauMoi, 10);
                updateTKQuery += ', MatKhau = @MatKhauHash ';
                request.input('MatKhauHash', sql.VarChar, hashed);
            }
            
            updateTKQuery += 'WHERE MaTK = @MaTK';
            await request
                .input('MaTK', sql.VarChar, MaTK)
                .query(updateTKQuery);
        }

        await transaction.commit();
        res.json({ message: 'Cập nhật thông tin thủ thư/admin thành công.' });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Lỗi cập nhật thủ thư/admin:', err);
        res.status(500).json({ message: 'Lỗi server khi cập nhật thủ thư/admin.' });
    }
};

// Xóa thủ thư/Admin
exports.deleteThuThu = async (req, res) => {
    const { MaTT } = req.params;

    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = transaction.request();

        const tkResult = await request
            .input('MaTT_TK', sql.VarChar, MaTT)
            .query('SELECT MaTK FROM ThuThu WHERE MaTT = @MaTT_TK');
        
        const MaTK = tkResult.recordset.length > 0 ? tkResult.recordset[0].MaTK : null;

        await request
            .input('MaTT', sql.VarChar, MaTT)
            .query('DELETE FROM ThuThu WHERE MaTT = @MaTT');

        if (MaTK) {
            await request
                .input('MaTK', sql.VarChar, MaTK)
                .query('DELETE FROM TaiKhoan WHERE MaTK = @MaTK');
        }

        await transaction.commit();
        res.json({ message: 'Xóa nhân viên thành công.' });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Lỗi xóa thủ thư/admin:', err);
        if (err.number === 547) {
            return res.status(409).json({ message: 'Không thể xóa: Nhân viên này có dữ liệu liên quan (ví dụ: đã duyệt phiếu mượn).' });
        }
        res.status(500).json({ message: 'Lỗi server khi xóa thủ thư/admin.' });
    }
};