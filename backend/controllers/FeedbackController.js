const sql = require('mssql');
const config = require('../db/dbConfig');
const { getUniqueId } = require("../utils/dbUtils"); // Giả sử bạn đã tách hàm này ra utils

// ============================================================
// 🅰️ DÀNH CHO ĐỘC GIẢ (READER)
// ============================================================

// 1. Gửi phản hồi mới
exports.submitFeedback = async (req, res) => {
    try {
        // Lấy MaDG từ Token (đã qua middleware authenticateToken)
        const maDG = req.user.MaDG; 
        const { noiDung } = req.body;

        if (!maDG) return res.status(401).json({ message: 'Không xác định được người dùng.' });
        if (!noiDung || !noiDung.trim()) {
            return res.status(400).json({ message: 'Nội dung phản hồi không được để trống.' });
        }

        const pool = await sql.connect(config);
        
        // Tạo ID duy nhất (Sử dụng hàm utility hoặc logic tự sinh)
        const maPH = await getUniqueId(pool, 'PH', 'PhanHoi', 'MaPH');
        
        await pool.request()
            .input('MaPH', sql.VarChar(10), maPH)
            .input('MaDG', sql.VarChar(10), maDG)
            .input('NoiDung', sql.NVarChar(1000), noiDung)
            .input('NgayGui', sql.DateTime, new Date())
            .input('TrangThai', sql.NVarChar(50), 'Chưa xử lý')
            .query(`
                INSERT INTO PhanHoi (MaPH, MaDG, NoiDung, NgayGui, TrangThai) 
                VALUES (@MaPH, @MaDG, @NoiDung, @NgayGui, @TrangThai)
            `);
            
        res.status(201).json({ 
            code: 200,
            message: 'Gửi phản hồi thành công! Cảm ơn ý kiến của bạn.', 
            data: { maPH } 
        });
        
    } catch (err) {
        console.error('❌ Lỗi gửi phản hồi:', err);
        res.status(500).json({ message: 'Lỗi server khi gửi phản hồi.' });
    }
};

// 2. Xem lịch sử phản hồi của chính mình
exports.getMyFeedback = async (req, res) => {
    try {
        const maDG = req.user.MaDG;
        const pool = await sql.connect(config);
        
        const result = await pool.request()
            .input('MaDG', sql.VarChar(10), maDG)
            .query(`
                SELECT 
                    PH.MaPH, 
                    PH.NoiDung, 
                    PH.NgayGui, 
                    PH.TrangThai,
                    TT.HoTen AS TenNguoiXuLy
                FROM PhanHoi PH
                LEFT JOIN ThuThu TT ON PH.MaTT_XuLy = TT.MaTT
                WHERE PH.MaDG = @MaDG
                ORDER BY PH.NgayGui DESC
            `);
        
        res.status(200).json({
            code: 200,
            data: result.recordset
        });
    } catch (err) {
        console.error('❌ Lỗi lấy lịch sử phản hồi:', err);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};


// ============================================================
// 🅱️ DÀNH CHO ADMIN / THỦ THƯ (MANAGER)
// ============================================================

// 3. Lấy tất cả phản hồi (Có lọc trạng thái)
exports.getAllFeedbackAdmin = async (req, res) => {
    try {
        const { status } = req.query; 
        const pool = await sql.connect(config);
        const request = pool.request();

        let query = `
            SELECT 
                PH.MaPH, PH.NoiDung, PH.NgayGui, PH.TrangThai,
                DG.HoTen AS TenDocGia, 
                DG.Email, 
                TT.HoTen AS TenNguoiXuLy
            FROM PhanHoi PH
            JOIN DocGia DG ON PH.MaDG = DG.MaDG
            LEFT JOIN ThuThu TT ON PH.MaTT_XuLy = TT.MaTT
        `;
        
        if (status) {
             query += ` WHERE PH.TrangThai = @Status`;
             request.input('Status', sql.NVarChar, status);
        }
        
        query += ` ORDER BY PH.NgayGui DESC`;

        const result = await request.query(query);
        res.status(200).json({
            code: 200,
            data: result.recordset
        });

    } catch (err) {
        console.error('❌ Admin: Lỗi lấy danh sách phản hồi:', err);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

// 4. Cập nhật trạng thái xử lý (Duyệt/Trả lời)
exports.updateFeedbackStatusAdmin = async (req, res) => {
    try {
        const { maPH } = req.params;
        const { trangThai } = req.body; 
        // Lấy MaTT từ token của admin đang đăng nhập
        const maTT = req.user.MaTT; 

        const validStatuses = ['Chưa xử lý', 'Đang xử lý', 'Đã xử lý'];

        if (!validStatuses.includes(trangThai)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
        }
        
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('MaPH', sql.VarChar(10), maPH)
            .input('TrangThai', sql.NVarChar(50), trangThai)
            .input('MaTT', sql.VarChar(10), maTT)
            .query(`
                UPDATE PhanHoi 
                SET TrangThai = @TrangThai, MaTT_XuLy = @MaTT 
                WHERE MaPH = @MaPH
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Không tìm thấy phản hồi.' });
        }
        
        res.status(200).json({ 
            code: 200, 
            message: 'Cập nhật trạng thái thành công.',
            data: { maPH, trangThai }
        });
    } catch (err) {
        console.error('❌ Admin: Lỗi cập nhật trạng thái:', err);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};