const sql = require('mssql');
const config = require('../db/dbConfig');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getUniqueId } = require('../utils/dbUtils');

// 👇 QUAN TRỌNG: Import transporter từ file cấu hình đã sửa Port 587
const transporter = require('../config/emailConfig'); 

// ============================================================
// XỬ LÝ ĐĂNG KÝ (CÓ TRANSACTION)
// ============================================================
exports.register = async (req, res) => {
    console.log('Received register request:', req.body);
    
    const { tenDangNhap, matKhau, hoTen, sdt, diaChi } = req.body; 

    if (!tenDangNhap || !matKhau || !hoTen) {
        return res.status(400).json({ 
            message: 'Vui lòng điền đủ Tên đăng nhập, Mật khẩu và Họ tên.' 
        });
    }

    let transaction;
    try {
        const pool = await sql.connect(config);
        
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request1 = transaction.request();
        const request2 = transaction.request();
        const request3 = transaction.request();
        const request4 = transaction.request();
        const request5 = transaction.request();

        // 1. Kiểm tra trùng TenDangNhap
        const checkUser = await request1
            .input('TenDangNhap', sql.VarChar, tenDangNhap)
            .query('SELECT MaTK FROM TaiKhoan WHERE TenDangNhap = @TenDangNhap');
        if (checkUser.recordset.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });
        }

        // 2. Kiểm tra trùng Email trong DocGia
        const checkEmail = await request2
            .input('Email', sql.VarChar, tenDangNhap)
            .query('SELECT MaDG FROM DocGia WHERE Email = @Email');
        if (checkEmail.recordset.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Email đã được sử dụng.' });
        }
        
        // Tạo ID duy nhất
        const MaTK = await getUniqueId(transaction, 'TK', 'TaiKhoan', 'MaTK');
        const MaDG = await getUniqueId(transaction, 'DG', 'DocGia', 'MaDG');
        
        const hashed = await bcrypt.hash(matKhau, 10);
        const loaiTK = 'DocGia';
        const NgayHetHanThe = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); 

        // 3. Insert vào TaiKhoan
        await request3
            .input('MaTK_TK', sql.VarChar, MaTK)
            .input('TenDangNhap_TK', sql.VarChar, tenDangNhap)
            .input('MatKhau_TK', sql.VarChar, hashed)
            .input('LoaiTK_TK', sql.VarChar, loaiTK)
            .input('TrangThai_TK', sql.VarChar, 'ChoXacThuc')
            .query('INSERT INTO TaiKhoan (MaTK, TenDangNhap, MatKhau, LoaiTK, TrangThai) VALUES (@MaTK_TK, @TenDangNhap_TK, @MatKhau_TK, @LoaiTK_TK, @TrangThai_TK)');

        // 4. Insert vào DocGia
        await request4
            .input('MaDG_DG', sql.VarChar, MaDG)
            .input('HoTen_DG', sql.NVarChar, hoTen)
            .input('DiaChi_DG', sql.NVarChar, diaChi || null)
            .input('SDT_DG', sql.VarChar, sdt || null)
            .input('Email_DG', sql.VarChar, tenDangNhap)
            .input('NgayHetHanThe_DG', sql.Date, NgayHetHanThe)
            .input('MaTK_DG', sql.VarChar, MaTK)
            .input('TrangThaiThe_DG', sql.VarChar, 'ChoKichHoat')
            .query('INSERT INTO DocGia (MaDG, HoTen, DiaChi, SDT, Email, NgayHetHanThe, TrangThaiThe, MaTK) VALUES (@MaDG_DG, @HoTen_DG, @DiaChi_DG, @SDT_DG, @Email_DG, @NgayHetHanThe_DG, @TrangThaiThe_DG, @MaTK_DG)');

        // 5. Tạo token kích hoạt
        const activationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await request5
            .input('Token_Act', sql.VarChar, activationToken)
            .input('MaTK_Token', sql.VarChar, MaTK)
            .input('Expires_Act', sql.DateTime, tokenExpires)
            .query('INSERT INTO ActivationToken (Token, MaTK, Expires) VALUES (@Token_Act, @MaTK_Token, @Expires_Act)');

        // 6. Commit Transaction
        await transaction.commit();

        console.log('Registration successful for:', tenDangNhap);
        
        // Gửi email kích hoạt
        try {
            const activationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/activate?token=${activationToken}`;
            await sendActivationEmail(tenDangNhap, hoTen, activationLink);
        } catch (emailError) {
            console.error('Error sending activation email:', emailError);
            // Không throw lỗi ở đây để user vẫn đăng ký được dù lỗi mail
        }

        res.status(201).json({ 
            message: 'Đăng ký thành công. Vui lòng kiểm tra email để kích hoạt tài khoản.',
            maTK: MaTK
        });

    } catch (err) {
        console.error('Register error:', err);
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rbErr) {
                console.error('Lỗi khi rollback transaction:', rbErr);
            }
        }
        res.status(500).json({ message: 'Lỗi đăng ký', error: err.message });
    }
};

// ============================================================
// HÀM GỬI EMAIL KÍCH HOẠT (ĐÃ SỬA: Dùng transporter import)
// ============================================================
async function sendActivationEmail(email, hoTen, activationLink) {
    try {
        const mailOptions = {
            from: `"Thư Viện QLTV" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Kích hoạt tài khoản Thư viện',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Chào mừng ${hoTen} đến với Thư viện!</h2>
                    <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng nhấp vào liên kết bên dưới để kích hoạt tài khoản:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${activationLink}" 
                           style="background-color: #10b981; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 6px; display: inline-block;">
                            Kích hoạt tài khoản
                        </a>
                    </div>
                    <p>Liên kết này sẽ hết hạn sau 24 giờ.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">Trân trọng,<br>Đội ngũ Thư viện</p>
                </div>
            `
        };

        // Sử dụng transporter đã import từ file config
        await transporter.sendMail(mailOptions);
        console.log('✅ Activation email sent to:', email);
    } catch (error) {
        console.error('❌ Error sending activation email:', error);
        throw new Error('Không thể gửi email kích hoạt');
    }
}

// ============================================================
// HÀM KÍCH HOẠT TÀI KHOẢN
// ============================================================
exports.activateAccount = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Token kích hoạt không hợp lệ.' });
    }

    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        const request1 = transaction.request();
        const request2 = transaction.request();
        const request3 = transaction.request();
        const request4 = transaction.request();

        // 1. Kiểm tra token
        const tokenCheck = await request1
            .input('Token', sql.VarChar, token)
            .query('SELECT MaTK, Expires FROM ActivationToken WHERE Token = @Token');

        if (tokenCheck.recordset.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Token kích hoạt không hợp lệ hoặc đã hết hạn.' });
        }

        const { MaTK, Expires } = tokenCheck.recordset[0];

        // 2. Kiểm tra hạn token
        if (new Date() > new Date(Expires)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Token kích hoạt đã hết hạn.' });
        }

        // 3. Cập nhật trạng thái tài khoản
        const updateAccountResult = await request2
            .input('MaTK_Acc', sql.VarChar, MaTK)
            .query("UPDATE TaiKhoan SET TrangThai = 'HoatDong' WHERE MaTK = @MaTK_Acc");

        if (updateAccountResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Không tìm thấy tài khoản để kích hoạt.' });
        }

        // 4. Cập nhật trạng thái thẻ
        const updateCardResult = await request3
            .input('MaTK_Card', sql.VarChar, MaTK)
            .query("UPDATE DocGia SET TrangThaiThe = 'ConHan' WHERE MaTK = @MaTK_Card");

        if (updateCardResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Không tìm thấy thông tin độc giả.' });
        }

        // 5. Xóa token đã sử dụng
        await request4
            .input('Token_Del', sql.VarChar, token)
            .query('DELETE FROM ActivationToken WHERE Token = @Token_Del');

        await transaction.commit();

        console.log('✅ Account activated successfully for MaTK:', MaTK);
        res.status(200).json({ message: 'Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.' });

    } catch (err) {
        console.error('❌ Activation error:', err);
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rbErr) {
                console.error('❌ Rollback error:', rbErr);
            }
        }
        res.status(500).json({ message: 'Lỗi kích hoạt tài khoản' });
    }
};

// ============================================================
// XỬ LÝ ĐĂNG NHẬP
// ============================================================
exports.login = async (req, res) => {
    const { tenDangNhap, matKhau } = req.body;
    
    console.log('🔄 Login attempt for:', tenDangNhap);

    if (!tenDangNhap || !matKhau) {
        return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    try {
        const pool = await sql.connect(config);
        
        // 2. TRUY VẤN TÀI KHOẢN
        const taiKhoanResult = await pool.request()
            .input('TenDangNhap', sql.VarChar, tenDangNhap)
            .query('SELECT MaTK, MatKhau, LoaiTK, TrangThai FROM TaiKhoan WHERE TenDangNhap = @TenDangNhap');

        // 3. KIỂM TRA TÀI KHOẢN TỒN TẠI
        if (taiKhoanResult.recordset.length === 0) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        const taiKhoan = taiKhoanResult.recordset[0];
        
        // 4. XÁC MINH MẬT KHẨU
        const valid = await bcrypt.compare(matKhau, taiKhoan.MatKhau);
        if (!valid) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        // 5. KIỂM TRA TRẠNG THÁI
        if (taiKhoan.TrangThai !== 'HoatDong') {
            return res.status(403).json({ 
                message: taiKhoan.TrangThai === 'ChoXacThuc' 
                    ? 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email.'
                    : 'Tài khoản bị khóa, vui lòng liên hệ quản trị viên.' 
            });
        }

        // 6. LẤY THÔNG TIN CHI TIẾT
        let userDetail;
        let userQuery;
        
        if (taiKhoan.LoaiTK === 'DocGia') {
            userQuery = `SELECT MaDG, HoTen, Email, SDT, DiaChi, TrangThaiThe, NgayHetHanThe, TongPhatChuaThanhToan FROM DocGia WHERE MaTK = @MaTK`;
        } else if (taiKhoan.LoaiTK === 'ThuThu' || taiKhoan.LoaiTK === 'Admin') {
            userQuery = `SELECT MaTT, HoTen, Email, SDT, Role FROM ThuThu WHERE MaTK = @MaTK`;
        } else {
            return res.status(400).json({ message: 'Loại tài khoản không hợp lệ.' });
        }

        const detailResult = await pool.request()
            .input('MaTK', sql.VarChar, taiKhoan.MaTK)
            .query(userQuery);

        userDetail = detailResult.recordset[0];
        
        if (!userDetail) {
            return res.status(500).json({ message: 'Lỗi hệ thống: Không tìm thấy thông tin chi tiết người dùng.' });
        }

        // 7. TẠO JWT TOKEN
        const tokenPayload = {
            MaTK: taiKhoan.MaTK,
            LoaiTK: taiKhoan.LoaiTK,
            UserId: taiKhoan.LoaiTK === 'DocGia' ? userDetail.MaDG : userDetail.MaTT
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '24h' }
        );

        // 8. CHUẨN BỊ RESPONSE
        let responseData = {
            token: token,
            message: 'Đăng nhập thành công!',
            user: { ...userDetail, LoaiTK: taiKhoan.LoaiTK, MaTK: taiKhoan.MaTK, TenDangNhap: tenDangNhap }
        };

        res.status(200).json(responseData);

    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ message: 'Lỗi đăng nhập' });
    }
};

// ============================================================
// HÀM GỬI EMAIL ĐẶT LẠI MẬT KHẨU (ĐÃ SỬA: Dùng transporter import)
// ============================================================
async function sendResetEmail(email, hoTen, resetLink) {
    try {
        console.log('🔄 Attempting to send reset email to:', email);
        
        const mailOptions = {
            from: `"Thư Viện QLTV" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 Đặt lại mật khẩu Thư viện',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #333;">Xin chào ${hoTen}!</h2>
                    <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu. Nhấp vào nút bên dưới để tạo mật khẩu mới:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" 
                           style="background: #f6ad55; color: white; padding: 14px 32px; 
                                  text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                            🔑 Đặt lại mật khẩu
                        </a>
                    </div>
                    <p style="color: red;">Lưu ý: Liên kết này sẽ hết hạn sau 1 giờ.</p>
                    <p>Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Reset email sent successfully. Msg ID:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Error sending reset email:', error);
        throw new Error(`Không thể gửi email đặt lại mật khẩu: ${error.message}`);
    }
}

// ============================================================
// QUÊN MẬT KHẨU
// ============================================================
exports.forgotPassword = async (req, res) => {
    const { tenDangNhap } = req.body; 

    if (!tenDangNhap) {
        return res.status(400).json({ message: 'Vui lòng cung cấp email đăng ký.' });
    }

    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = transaction.request();

        // 1. Kiểm tra Tài khoản
        const result = await request
            .input('TenDangNhap', sql.VarChar, tenDangNhap)
            .query('SELECT MaTK, LoaiTK, TrangThai FROM TaiKhoan WHERE TenDangNhap = @TenDangNhap AND TrangThai = \'HoatDong\'');

        if (result.recordset.length === 0) {
            await transaction.commit(); 
            // Trả về 200 giả vờ để bảo mật
            return res.status(200).json({ message: 'Nếu tài khoản tồn tại, một email đặt lại mật khẩu đã được gửi.' });
        }
        
        const taiKhoan = result.recordset[0];

        // 2. Tạo Token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); 
        
        request.input('MaTK', sql.VarChar, taiKhoan.MaTK);
        request.input('Token', sql.VarChar, resetToken);
        request.input('Expires', sql.DateTime, tokenExpires);
        
        // 3. Xóa Token cũ & Lưu Token mới
        await request.query('DELETE FROM ActivationToken WHERE MaTK = @MaTK');
        await request.query('INSERT INTO ActivationToken (MaTK, Token, Expires) VALUES (@MaTK, @Token, @Expires)');

        // 4. Gửi Email
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        const hoTen = taiKhoan.LoaiTK === 'DocGia' ? 'Người dùng Thư viện' : taiKhoan.LoaiTK;
        
        await sendResetEmail(tenDangNhap, hoTen, resetLink);

        await transaction.commit();
        res.status(200).json({ message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.' });

    } catch (err) {
        console.error('Forgot password error:', err);
        if (transaction) await transaction.rollback();
        res.status(500).json({ message: 'Lỗi server khi xử lý yêu cầu.' });
    }
};

// ============================================================
// ĐẶT LẠI MẬT KHẨU
// ============================================================
exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body; 

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Thiếu token hoặc mật khẩu mới.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = transaction.request();

        // 1. Xác minh token
        const tokenResult = await request
            .input('Token', sql.VarChar, token)
            .query('SELECT MaTK, Expires FROM ActivationToken WHERE Token = @Token');

        if (tokenResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Token không hợp lệ hoặc đã được sử dụng.' });
        }

        const { MaTK, Expires } = tokenResult.recordset[0];
        
        if (new Date() > new Date(Expires)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Token đã hết hạn.' });
        }

        // 2. Cập nhật mật khẩu
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateResult = await request
            .input('MaTK', sql.VarChar, MaTK)
            .input('HashedPassword', sql.VarChar, hashedPassword)
            .query('UPDATE TaiKhoan SET MatKhau = @HashedPassword WHERE MaTK = @MaTK');

        if (updateResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
        }

        // 3. Xóa token
        await request.query('DELETE FROM ActivationToken WHERE Token = @Token');

        await transaction.commit();
        console.log('✅ Password reset successful for MaTK:', MaTK);

        res.status(200).json({ message: 'Đặt lại mật khẩu thành công.' });

    } catch (err) {
        console.error('❌ Reset password error:', err);
        if (transaction) try { await transaction.rollback(); } catch(e){}
        res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu.' });
    }
};

// ============================================================
// CÁC HÀM GET/UPDATE PROFILE
// ============================================================
exports.getProfile = async (req, res) => {
    const MaNguoiDung = req.user.UserId;
    const LoaiTK = req.user.LoaiTK;
    try {
        const pool = await sql.connect(config);
        if (LoaiTK === 'DocGia') {
            const result = await pool.request().input('MaNguoiDung', sql.VarChar, MaNguoiDung).query(`SELECT dg.MaDG, dg.HoTen, dg.Email, dg.SDT, dg.DiaChi, dg.TrangThaiThe, dg.NgayHetHanThe, tk.MaTK, tk.LoaiTK, tk.TenDangNhap FROM DocGia dg INNER JOIN TaiKhoan tk ON dg.MaTK = tk.MaTK WHERE dg.MaDG = @MaNguoiDung`);
            if (result.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy thông tin.' });
            res.json(result.recordset[0]);
        } else {
            const result = await pool.request().input('MaNguoiDung', sql.VarChar, MaNguoiDung).query(`SELECT tt.MaTT, tt.HoTen, tt.Email, tt.SDT, tt.Role, tk.MaTK, tk.LoaiTK, tk.TenDangNhap FROM ThuThu tt INNER JOIN TaiKhoan tk ON tt.MaTK = tk.MaTK WHERE tt.MaTT = @MaNguoiDung`);
            if (result.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy thông tin.' });
            res.json(result.recordset[0]);
        }
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};

exports.updateProfile = async (req, res) => {
    const MaNguoiDung = req.user.UserId;
    const LoaiTK = req.user.LoaiTK;
    const { HoTen, SDT, DiaChi } = req.body;
    try {
        const pool = await sql.connect(config);
        if (LoaiTK === 'DocGia') {
            await pool.request().input('MaDG', sql.VarChar, MaNguoiDung).input('HoTen', sql.NVarChar, HoTen).input('SDT', sql.VarChar, SDT).input('DiaChi', sql.NVarChar, DiaChi).query(`UPDATE DocGia SET HoTen=@HoTen, SDT=@SDT, DiaChi=@DiaChi WHERE MaDG=@MaDG`);
        } else {
            await pool.request().input('MaTT', sql.VarChar, MaNguoiDung).input('SDT', sql.VarChar, SDT).query(`UPDATE ThuThu SET SDT=@SDT WHERE MaTT=@MaTT`);
        }
        res.status(200).json({ message: 'Cập nhật thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};