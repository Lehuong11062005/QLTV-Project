const sql = require('mssql');
const config = require('../db/dbConfig');
const { getUniqueId } = require('../utils/dbUtils');

// ============================================================
// A. API DỮ LIỆU PHỤ TRỢ (Cho Dropdown Form Admin)
// ============================================================

// Lấy danh sách Tác giả & Danh mục (để điền vào Select box khi thêm sách)
exports.getBookMetadata = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const authors = await pool.request().query('SELECT MaTG, TenTG FROM TacGia ORDER BY TenTG');
        const categories = await pool.request().query('SELECT MaDM, TenDM FROM DanhMuc ORDER BY TenDM');
        
        res.status(200).json({
            code: 200,
            data: {
                authors: authors.recordset,
                categories: categories.recordset
            }
        });
    } catch (err) {
        console.error('Lỗi lấy metadata:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu phụ trợ.' });
    }
};

// ============================================================
// B. API TÌM KIẾM SÁCH (QUAN TRỌNG - GIỮ NGUYÊN 100%)
// ============================================================
exports.searchBooks = async (req, res) => {
    const { search, maDM, maTG, page = 1, limit = 10 } = req.query; 

    try {
        const pool = await sql.connect(config);
        const request = pool.request();
        
        const searchKeyword = search ? search.trim() : null;
        const categoryId = maDM ? maDM.trim() : null;
        const authorId = maTG ? maTG.trim() : null;

        request.input('search', sql.NVarChar, searchKeyword);
        request.input('maDM', sql.VarChar, categoryId);
        request.input('maTG', sql.VarChar, authorId);
        
        let whereConditions = [];
        
        if (searchKeyword) {
            whereConditions.push(`(S.TenSach LIKE '%' + @search + '%' OR TG.TenTG LIKE '%' + @search + '%' OR DM.TenDM LIKE '%' + @search + '%' OR S.MoTa LIKE '%' + @search + '%')`);
        }

        if (categoryId) {
            whereConditions.push(`S.MaDM = @maDM`);
        }

        if (authorId) {
            whereConditions.push(`S.MaTG = @maTG`);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        const parsedLimit = parseInt(limit);
        const parsedPage = parseInt(page);
        const offset = (parsedPage - 1) * parsedLimit;
        
        const countQuery = `
            SELECT COUNT(*) as totalCount
            FROM Sach S
            LEFT JOIN TacGia TG ON S.MaTG = TG.MaTG
            LEFT JOIN DanhMuc DM ON S.MaDM = DM.MaDM
            ${whereClause}
        `;
        
        const countResult = await request.query(countQuery);
        const totalCount = countResult.recordset[0].totalCount;
        const totalPages = Math.ceil(totalCount / parsedLimit);
        
        if (totalCount === 0) {
             return res.status(200).json({
                data: [],
                totalCount: 0,
                totalPages: 0,
                currentPage: parsedPage,
                itemsPerPage: parsedLimit,
                message: "Không tìm thấy sách nào."
            });
        }

        const booksQuery = `
            SELECT 
                S.MaSach, S.TenSach, S.MoTa, S.NamXuatBan, S.AnhMinhHoa, 
                S.GiaBan, S.SoLuongTon,
                ISNULL((
                    SELECT COUNT(BST.MaBanSao) 
                    FROM BanSao_ThuVien BST 
                    WHERE BST.MaSach = S.MaSach 
                    AND BST.TrangThaiBanSao = N'SanSang' 
                ), 0) as SoLuongCoSan,
                S.TinhTrang, TG.TenTG, DM.TenDM, S.MaTG, S.MaDM, S.DonViTinh
            FROM Sach S
            LEFT JOIN TacGia TG ON S.MaTG = TG.MaTG
            LEFT JOIN DanhMuc DM ON S.MaDM = DM.MaDM
            ${whereClause}
            ORDER BY S.MaSach DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `;
        
        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, parsedLimit);
        
        const booksResult = await request.query(booksQuery);
        
        res.status(200).json({
            data: booksResult.recordset,
            totalCount: totalCount,
            totalPages: totalPages,
            currentPage: parsedPage,
            itemsPerPage: parsedLimit,
            message: searchKeyword ? `Tìm thấy ${booksResult.recordset.length} kết quả` : "Lấy danh sách sách thành công."
        });
        
    } catch (err) {
        console.error('❌ Lỗi tìm kiếm sách:', err);
        res.status(500).json({ message: 'Lỗi server.', error: err.message });
    }
};

// ============================================================
// C. QUẢN LÝ SÁCH (ADMIN CRUD - ĐÃ CẬP NHẬT CHO KHỚP)
// ============================================================

// 1. Lấy danh sách sách (Admin)
exports.getAllBooksAdmin = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT 
                S.*, 
                TG.TenTG, 
                DM.TenDM
            FROM Sach S
            LEFT JOIN TacGia TG ON S.MaTG = TG.MaTG
            LEFT JOIN DanhMuc DM ON S.MaDM = DM.MaDM
            ORDER BY S.MaSach DESC
        `);
        // Trả về đúng chuẩn { code: 200, data: [...] }
        res.status(200).json({ code: 200, data: result.recordset });
    } catch (err) {
        console.error('Lỗi lấy sách Admin:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách sách.' });
    }
};

// 2. Lấy chi tiết 1 sách (Public/Admin dùng chung cũng được)
exports.getSachById = async (req, res) => {
    const { MaSach } = req.params; // Lưu ý: Router bên Frontend gọi là :id nhưng vào đây là req.params.id hoặc .MaSach tùy router khai báo
    // Nhưng ở đây code cũ bạn dùng MaSach, nên giữ nguyên
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('MaSach', sql.VarChar, MaSach)
            .query(`
                SELECT S.*, TG.TenTG, DM.TenDM
                FROM Sach S
                LEFT JOIN TacGia TG ON S.MaTG = TG.MaTG
                LEFT JOIN DanhMuc DM ON S.MaDM = DM.MaDM
                WHERE S.MaSach = @MaSach
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sách.' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Lỗi lấy chi tiết sách:', err);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

// 3. Thêm sách mới (Admin)
exports.createBook = async (req, res) => {
    const { tenSach, maTG, maDM, giaBan, soLuongTon, namXuatBan, moTa, anhMinhHoa, donViTinh } = req.body;

    // Kiểm tra dữ liệu đầu vào (Validation cơ bản)
    if (!tenSach || !maTG || !maDM) {
        return res.status(400).json({ message: 'Tên sách, Tác giả và Danh mục là bắt buộc.' });
    }

    try {
        const pool = await sql.connect(config);
        const request = pool.request();
        const maSach = await getUniqueId(request, 'S', 'Sach', 'MaSach');
        const tinhTrang = soLuongTon > 0 ? 'Còn' : 'Hết';

        await request
            .input('MaSach', sql.VarChar, maSach)
            .input('TenSach', sql.NVarChar, tenSach)
            .input('MoTa', sql.NVarChar, moTa || null)
            .input('NamXuatBan', sql.Int, namXuatBan || null)
            .input('AnhMinhHoa', sql.NVarChar, anhMinhHoa || null)
            .input('GiaBan', sql.Decimal, giaBan || 0)
            .input('DonViTinh', sql.NVarChar, donViTinh || 'Cuốn')
            .input('SoLuongTon', sql.Int, soLuongTon || 0)
            .input('TinhTrang', sql.NVarChar, tinhTrang)
            .input('MaTG', sql.VarChar, maTG)
            .input('MaDM', sql.VarChar, maDM)
            .query(`
                INSERT INTO Sach (MaSach, TenSach, MoTa, NamXuatBan, AnhMinhHoa, GiaBan, DonViTinh, SoLuongTon, TinhTrang, MaTG, MaDM)
                VALUES (@MaSach, @TenSach, @MoTa, @NamXuatBan, @AnhMinhHoa, @GiaBan, @DonViTinh, @SoLuongTon, @TinhTrang, @MaTG, @MaDM)
            `);

        res.status(201).json({ code: 200, message: 'Thêm sách thành công.', data: { maSach } });
    } catch (err) {
        console.error('Lỗi thêm sách:', err);
        res.status(500).json({ message: 'Lỗi server khi thêm sách.' });
    }
};

// 4. Cập nhật sách (Admin)
exports.updateBook = async (req, res) => {
    const { id } = req.params; // MaSach lấy từ URL
    const { tenSach, maTG, maDM, giaBan, soLuongTon, namXuatBan, moTa, anhMinhHoa, donViTinh, tinhTrang } = req.body;

    try {
        const pool = await sql.connect(config);
        const request = pool.request();
        let updateFields = [];
        
        request.input('MaSach', sql.VarChar, id);

        // Xây dựng câu query động (chỉ update trường có gửi lên)
        if (tenSach !== undefined) { updateFields.push('TenSach = @TenSach'); request.input('TenSach', sql.NVarChar, tenSach); }
        if (moTa !== undefined) { updateFields.push('MoTa = @MoTa'); request.input('MoTa', sql.NVarChar, moTa); }
        if (namXuatBan !== undefined) { updateFields.push('NamXuatBan = @NamXuatBan'); request.input('NamXuatBan', sql.Int, namXuatBan); }
        if (anhMinhHoa !== undefined) { updateFields.push('AnhMinhHoa = @AnhMinhHoa'); request.input('AnhMinhHoa', sql.NVarChar, anhMinhHoa); }
        if (giaBan !== undefined) { updateFields.push('GiaBan = @GiaBan'); request.input('GiaBan', sql.Decimal, giaBan); }
        if (donViTinh !== undefined) { updateFields.push('DonViTinh = @DonViTinh'); request.input('DonViTinh', sql.NVarChar, donViTinh); }
        if (maTG !== undefined) { updateFields.push('MaTG = @MaTG'); request.input('MaTG', sql.VarChar, maTG); }
        if (maDM !== undefined) { updateFields.push('MaDM = @MaDM'); request.input('MaDM', sql.VarChar, maDM); }
        if (tinhTrang !== undefined) { updateFields.push('TinhTrang = @TinhTrang'); request.input('TinhTrang', sql.NVarChar, tinhTrang); }
        
        if (soLuongTon !== undefined) {
            updateFields.push('SoLuongTon = @SoLuongTon');
            request.input('SoLuongTon', sql.Int, soLuongTon);
            // Tự động cập nhật tình trạng nếu số lượng về 0
            if (soLuongTon <= 0 && tinhTrang === undefined) {
                 updateFields.push("TinhTrang = 'Hết'");
            } else if (soLuongTon > 0 && tinhTrang === undefined) {
                 updateFields.push("TinhTrang = 'Còn'");
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'Không có dữ liệu để cập nhật.' });
        }

        const updateQuery = `UPDATE Sach SET ${updateFields.join(', ')} WHERE MaSach = @MaSach`;
        const result = await request.query(updateQuery);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sách.' });
        }

        res.status(200).json({ code: 200, message: 'Cập nhật sách thành công.' });
    } catch (err) {
        console.error('Lỗi cập nhật sách:', err);
        res.status(500).json({ message: 'Lỗi server khi cập nhật sách.' });
    }
};

// 5. Xóa sách (Admin)
exports.deleteBook = async (req, res) => {
    const { id } = req.params; // MaSach
    try {
        const pool = await sql.connect(config);
        
        // Kiểm tra xem sách có bản sao không?
        const check = await pool.request()
            .input('MaSach', sql.VarChar, id)
            .query('SELECT COUNT(*) as Count FROM BanSao_ThuVien WHERE MaSach = @MaSach');
            
        if (check.recordset[0].Count > 0) {
            return res.status(409).json({ message: 'Không thể xóa: Sách này đang có bản sao trong kho.' });
        }

        const result = await pool.request()
            .input('MaSach', sql.VarChar, id)
            .query('DELETE FROM Sach WHERE MaSach = @MaSach');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Sách không tồn tại.' });
        }
        res.status(200).json({ code: 200, message: 'Xóa sách thành công.' });
    } catch (err) {
        console.error('Lỗi xóa sách:', err);
        // Lỗi ràng buộc khóa ngoại (Foreign Key)
        if (err.number === 547) {
            return res.status(409).json({ message: 'Không thể xóa: Sách đã từng được mượn hoặc mua.' });
        }
        res.status(500).json({ message: 'Lỗi server khi xóa sách.' });
    }
};