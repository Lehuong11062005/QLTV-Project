// Tệp: utils/dbUtils.js
// Nơi chứa các hàm tiện ích dùng chung liên quan đến CSDL.

const sql = require('mssql');

/**
 * Tạo ID ngẫu nhiên và kiểm tra tính duy nhất TRONG TRANSACTION.
 *
 * @param {object} transaction - Transaction object (KHÔNG phải request).
 * @param {string} prefix - Tiền tố ID (ví dụ: 'TK', 'GD').
 * @param {string} tableName - Tên bảng để kiểm tra.
 * @param {string} idColumn - Tên cột ID để kiểm tra.
 * @returns {string} ID duy nhất mới.
 */
async function getUniqueId(transaction, prefix, tableName, idColumn) {
    let newId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!isUnique && attempts < maxAttempts) {
        // Cấu trúc 10 ký tự: 2(prefix) + 6(timestamp) + 2(random)
        const randomSuffix = Math.floor(Math.random() * 90 + 10); 
        const timestamp = Date.now().toString().slice(-6);
        newId = `${prefix}${timestamp}${randomSuffix}`;

        // Tạo request MỚI cho mỗi lần kiểm tra
        const checkRequest = transaction.request();
        const checkResult = await checkRequest
            .input('checkId', sql.VarChar, newId) // Dùng tên parameter khác nhau
            .query(`SELECT 1 FROM ${tableName} WHERE ${idColumn} = @checkId`);

        if (checkResult.recordset.length === 0) {
            isUnique = true;
        }
        
        attempts++;
    }

    if (!isUnique) {
        throw new Error(`Không thể tạo ID duy nhất cho ${tableName} sau ${maxAttempts} lần thử.`);
    }
    return newId;
}

// Xuất hàm này ra để file khác có thể dùng
module.exports = {
    getUniqueId
};