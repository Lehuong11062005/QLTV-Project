// db/testConnection.js
require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

console.log('⏳ Đang kiểm tra kết nối SQL Server...');

sql.connect(config)
  .then(pool => {
    console.log('✅ Kết nối SQL Server thành công!');
    pool.close();
  })
  .catch(err => {
    console.error('❌ Kết nối thất bại:', err.message);
  });
