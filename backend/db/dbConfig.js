// db/dbConfig.js
const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT),
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Hàm kết nối database
async function connectDB() {
    try {
        console.log('🔄 Đang kết nối tới SQL Server...');
        await sql.connect(dbConfig);
        console.log('✅ Kết nối SQL Server thành công!');
    } catch (err) {
        console.error('❌ Lỗi kết nối SQL Server:', err.message);
        process.exit(1);
    }
}

module.exports = { dbConfig, connectDB, sql };