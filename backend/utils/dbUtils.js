const sql = require('mssql');

/**
 * Tạo ID ngẫu nhiên và kiểm tra tính duy nhất.
 * Hỗ trợ cả Connection Pool (cũ) và Transaction (mới).
 *
 * @param {object} dbContext - Có thể là Pool hoặc Transaction.
 * @param {string} prefix - Tiền tố ID.
 * @param {string} tableName - Tên bảng.
 * @param {string} idColumn - Tên cột ID.
 */
async function getUniqueId(dbContext, prefix, tableName, idColumn) {
    let newId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!isUnique && attempts < maxAttempts) {
        // Tạo ID: Prefix + timestamp + random
        const randomSuffix = Math.floor(Math.random() * 90 + 10); 
        const timestamp = Date.now().toString().slice(-6);
        newId = `${prefix}${timestamp}${randomSuffix}`;

        let request;

        // --- 👇 ĐOẠN CHECK THÔNG MINH ĐỂ TRÁNH LỖI CODE CŨ 👇 ---
        
        // Kiểm tra: Nếu dbContext có hàm .request() (tức là Pool - cách cũ)
        if (typeof dbContext.request === 'function') {
            request = dbContext.request(); 
        } 
        // Ngược lại: Nếu không có hàm .request() (tức là Transaction - cách mới)
        else {
            request = new sql.Request(dbContext);
        }
        // -----------------------------------------------------------

        const checkResult = await request
            .input('checkId', sql.VarChar, newId)
            .query(`SELECT 1 FROM ${tableName} WHERE ${idColumn} = @checkId`);

        if (checkResult.recordset.length === 0) {
            isUnique = true;
        } else {
            attempts++;
        }
    }

    if (!isUnique) {
        throw new Error(`Không thể tạo ID duy nhất cho ${tableName} sau ${maxAttempts} lần thử.`);
    }
    return newId;
}

module.exports = { getUniqueId };