// utils/configHelper.js
const sql = require('mssql');

const configHelper = {
    /**
     * Lấy cấu hình hệ thống từ database
     */
    getSystemConfig: async () => {
        try {
            // Giả sử có bảng Config trong database
            const result = await sql.query`
                SELECT TenThamSo, GiaTri FROM Config
            `;
            
            const config = {};
            result.recordset.forEach(item => {
                config[item.TenThamSo] = item.GiaTri;
            });

            // Giá trị mặc định nếu không có trong database
            return {
                MAX_MUON_TOI_DA: parseInt(config.MAX_MUON_TOI_DA) || 5,
                NGUONG_TIEN_PHAT: parseInt(config.NGUONG_TIEN_PHAT) || 100000,
                ...config
            };
        } catch (error) {
            console.error('❌ Lỗi lấy cấu hình hệ thống:', error);
            // Trả về giá trị mặc định
            return {
                MAX_MUON_TOI_DA: 5,
                NGUONG_TIEN_PHAT: 100000
            };
        }
    }
};

module.exports = configHelper;