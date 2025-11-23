const sql = require('mssql');
const { getUniqueId } = require('../utils/dbUtils');

// --- THÊM TÁC GIẢ ---
exports.createAuthor = async (req, res) => {
    const { tenTG } = req.body;
    
    // Validation
    if (!tenTG || tenTG.trim() === "") {
        return res.status(400).json({ message: 'Tên tác giả không được để trống.' });
    }

    const pool = await sql.connect();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Tạo ID: TG + timestamp (Dùng hàm getUniqueId "thông minh" vừa sửa)
        const maTG = await getUniqueId(transaction, 'TG', 'TacGia', 'MaTG');

        const request = new sql.Request(transaction);
        await request
            .input('MaTG', sql.VarChar, maTG)
            .input('TenTG', sql.NVarChar, tenTG.trim())
            .query(`INSERT INTO TacGia (MaTG, TenTG) VALUES (@MaTG, @TenTG)`);

        await transaction.commit();

        // Trả về dữ liệu vừa tạo để Frontend có thể cập nhật ngay vào Dropdown mà ko cần reload trang
        res.status(201).json({ 
            code: 200, 
            message: 'Thêm tác giả thành công', 
            data: { maTG, tenTG } 
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Lỗi thêm tác giả:", error);
        res.status(500).json({ message: 'Lỗi server khi thêm tác giả.' });
    }
};

// --- THÊM DANH MỤC ---
exports.createCategory = async (req, res) => {
    const { tenDM } = req.body;

    // Validation
    if (!tenDM || tenDM.trim() === "") {
        return res.status(400).json({ message: 'Tên danh mục không được để trống.' });
    }

    const pool = await sql.connect();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Tạo ID: DM + timestamp
        const maDM = await getUniqueId(transaction, 'DM', 'DanhMuc', 'MaDM');

        const request = new sql.Request(transaction);
        await request
            .input('MaDM', sql.VarChar, maDM)
            .input('TenDM', sql.NVarChar, tenDM.trim())
            .query(`INSERT INTO DanhMuc (MaDM, TenDM) VALUES (@MaDM, @TenDM)`);

        await transaction.commit();

        res.status(201).json({ 
            code: 200, 
            message: 'Thêm danh mục thành công', 
            data: { maDM, tenDM } 
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Lỗi thêm danh mục:", error);
        res.status(500).json({ message: 'Lỗi server khi thêm danh mục.' });
    }
};