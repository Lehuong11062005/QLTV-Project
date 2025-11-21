const jwt = require('jsonwebtoken');
const sql = require('mssql');
const config = require('../db/dbConfig');

// ============================================================
// 1. AUTHENTICATE TOKEN (Xác thực JWT và Trạng thái Tài khoản)
// ============================================================
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    
    // 1. Kiểm tra Token có tồn tại không
    if (!token) {
        return res.status(401).json({ message: 'Truy cập bị từ chối. Không có token xác thực.' });
    }

    try {
        // 2. Giải mã Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        
        // 3. Kiểm tra trạng thái tài khoản và lấy thông tin cần thiết
        const pool = await sql.connect(config);
        
        // Truy vấn cả TaiKhoan và DocGia để lấy MaDG nếu là độc giả
        const result = await pool.request()
            .input('MaTK', sql.VarChar, decoded.MaTK) // Dùng MaTK từ JWT
            .query(`
                SELECT 
                    TK.MaTK, 
                    TK.LoaiTK, 
                    TK.TrangThai,
                    DG.MaDG -- Lấy MaDG nếu tài khoản là độc giả
                FROM TaiKhoan TK
                LEFT JOIN DocGia DG ON TK.MaTK = DG.MaTK
                WHERE TK.MaTK = @MaTK
            `);

        const userAccount = result.recordset[0];

        // 4. Kiểm tra tài khoản có tồn tại và đang hoạt động không
        if (!userAccount) {
            return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
        }
        if (userAccount.TrangThai !== 'HoatDong') {
            return res.status(403).json({ message: 'Tài khoản đã bị khóa.' });
        }
        
        // 5. Gắn thông tin người dùng vào request (đã được xác thực và hoạt động)
        req.user = { 
            ...decoded,
            role: userAccount.LoaiTK, // Role chính xác từ CSDL
            MaDG: userAccount.MaDG || null // Gắn MaDG nếu tồn tại
        };
        
        next();
        
    } catch (err) {
        // Lỗi: Token hết hạn, sai chữ ký, hoặc lỗi CSDL
        console.error('Lỗi xác thực token:', err.message);
        // Trả về 401 thay vì 403 cho lỗi token, theo chuẩn REST
        return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' }); 
    }
}

// ============================================================
// 2. AUTHORIZE ROLE (Ủy quyền dựa trên Vai trò)
// ============================================================
/**
 * Kiểm tra xem người dùng có một trong các vai trò được phép hay không.
 * @param {string[]} allowedRoles - Mảng chứa các vai trò được phép (ví dụ: ['Admin', 'ThuThu'])
 */
function authorizeRoles(allowedRoles) {
    return (req, res, next) => {
        
        // 1. Nếu vai trò không có trong allowedRoles, trả về 403
        if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Bạn không có quyền truy cập chức năng này.' });
        }
        
        // 2. Nếu là độc giả, kiểm tra MaDG có tồn tại không (guardrail cho các route độc giả)
        if (req.user.role === 'DocGia' && !req.user.MaDG) {
            return res.status(403).json({ message: 'Tài khoản không liên kết với Mã Độc Giả.' });
        }
        
        next();
    };
}

module.exports = { authenticateToken, authorizeRoles };