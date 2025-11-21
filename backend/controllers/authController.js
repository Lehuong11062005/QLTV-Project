// controllers/authController.js
const sql = require('mssql');
const config = require('../db/dbConfig');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // ✅ THÊM DÒNG NÀY
const { getUniqueId } = require('../utils/dbUtils');

// ============================================================
// XỬ LÝ ĐĂNG KÝ (CÓ TRANSACTION) - ĐÃ SỬA THEO YÊU CẦU
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

        // Tạo request RIÊNG cho mỗi lần truy vấn
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
        
        // Tạo ID duy nhất - sử dụng request riêng
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
        
        // Gửi email kích hoạt (không nằm trong transaction)
        try {
            const activationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/activate?token=${activationToken}`;
            await sendActivationEmail(tenDangNhap, hoTen, activationLink);
        } catch (emailError) {
            console.error('Error sending activation email:', emailError);
            // Không throw error vì đăng ký vẫn thành công
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
        res.status(500).json({ 
            message: 'Lỗi đăng ký', 
            error: err.message 
        });
    }
};

// ============================================================
// HÀM GỬI EMAIL KÍCH HOẠT
// ============================================================
async function sendActivationEmail(email, hoTen, activationLink) {
    try {
        // Cấu hình email transporter (sử dụng nodemailer hoặc service khác)
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
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
                    <p>Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email này.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Trân trọng,<br>
                        Đội ngũ Thư viện
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Activation email sent to:', email);
    } catch (error) {
        console.error('Error sending activation email:', error);
        throw new Error('Không thể gửi email kích hoạt');
    }
}

// ============================================================
// HÀM KÍCH HOẠT TÀI KHOẢN (ĐÃ SỬA LỖI PARAMETER TRÙNG)
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
        
        // Tạo request RIÊNG cho mỗi truy vấn để tránh trùng parameter
        const request1 = transaction.request();
        const request2 = transaction.request();
        const request3 = transaction.request();
        const request4 = transaction.request();

        console.log('🔄 Processing activation for token');

        // 1. Kiểm tra token với request1
        const tokenCheck = await request1
            .input('Token', sql.VarChar, token)
            .query('SELECT MaTK, Expires FROM ActivationToken WHERE Token = @Token');

        if (tokenCheck.recordset.length === 0) {
            await transaction.rollback();
            console.log('❌ Invalid activation token');
            return res.status(400).json({ message: 'Token kích hoạt không hợp lệ hoặc đã hết hạn.' });
        }

        const { MaTK, Expires } = tokenCheck.recordset[0];

        // 2. Kiểm tra hạn token
        if (new Date() > new Date(Expires)) {
            await transaction.rollback();
            console.log('❌ Expired activation token');
            return res.status(400).json({ message: 'Token kích hoạt đã hết hạn.' });
        }

        // 3. Cập nhật trạng thái tài khoản với request2
        const updateAccountResult = await request2
            .input('MaTK_Acc', sql.VarChar, MaTK)
            .query("UPDATE TaiKhoan SET TrangThai = 'HoatDong' WHERE MaTK = @MaTK_Acc");

        if (updateAccountResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            console.log('❌ Account not found for activation:', MaTK);
            return res.status(404).json({ message: 'Không tìm thấy tài khoản để kích hoạt.' });
        }

        // 4. Cập nhật trạng thái thẻ với request3
        const updateCardResult = await request3
            .input('MaTK_Card', sql.VarChar, MaTK)
            .query("UPDATE DocGia SET TrangThaiThe = 'ConHan' WHERE MaTK = @MaTK_Card");

        if (updateCardResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            console.log('❌ Reader not found for activation:', MaTK);
            return res.status(404).json({ message: 'Không tìm thấy thông tin độc giả.' });
        }

        // 5. Xóa token đã sử dụng với request4
        await request4
            .input('Token_Del', sql.VarChar, token)
            .query('DELETE FROM ActivationToken WHERE Token = @Token_Del');

        // 6. Commit Transaction
        await transaction.commit();

        console.log('✅ Account activated successfully for MaTK:', MaTK);

        res.status(200).json({ 
            message: 'Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.' 
        });

    } catch (err) {
        console.error('❌ Activation error:', err);
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('✅ Transaction rolled back due to error');
            } catch (rbErr) {
                console.error('❌ Rollback error:', rbErr);
            }
        }
        res.status(500).json({ 
            message: 'Lỗi kích hoạt tài khoản', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
// ============================================================
// XỬ LÝ ĐĂNG NHẬP (ĐÃ SỬA LỖI)
// ============================================================
exports.login = async (req, res) => {
    // ✅ SỬA: Nhận đúng tên trường từ frontend
    const { tenDangNhap, matKhau } = req.body;
    
    console.log('🔄 Login attempt for:', tenDangNhap);

    // 1. VALIDATE INPUT - 400 Bad Request
    if (!tenDangNhap || !matKhau) {
        return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    try {
        const pool = await sql.connect(config);
        
        // 2. TRUY VẤN TÀI KHOẢN - SỬA: dùng tenDangNhap thay vì TenDangNhap
        const taiKhoanResult = await pool.request()
            .input('TenDangNhap', sql.VarChar, tenDangNhap)
            .query('SELECT MaTK, MatKhau, LoaiTK, TrangThai FROM TaiKhoan WHERE TenDangNhap = @TenDangNhap');

        // 3. KIỂM TRA TÀI KHOẢN TỒN TẠI - 401 Unauthorized
        if (taiKhoanResult.recordset.length === 0) {
            console.log('❌ User not found:', tenDangNhap);
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        const taiKhoan = taiKhoanResult.recordset[0];
        console.log('✅ User found:', taiKhoan.MaTK, 'Status:', taiKhoan.TrangThai);
        
        // 4. XÁC MINH MẬT KHẨU - SỬA: dùng matKhau thay vì MatKhau
        const valid = await bcrypt.compare(matKhau, taiKhoan.MatKhau);
        if (!valid) {
            console.log('❌ Invalid password for:', tenDangNhap);
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        // 5. KIỂM TRA TRẠNG THÁI - 403 Forbidden
        if (taiKhoan.TrangThai !== 'HoatDong') {
            console.log('❌ Account not active:', taiKhoan.TrangThai);
            return res.status(403).json({ 
                message: taiKhoan.TrangThai === 'ChoXacThuc' 
                    ? 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để kích hoạt tài khoản.'
                    : 'Tài khoản bị khóa, vui lòng liên hệ quản trị viên.' 
            });
        }

        // 6. LẤY THÔNG TIN CHI TIẾT NGƯỜI DÙNG
        let userDetail;
        let userQuery;
        
        if (taiKhoan.LoaiTK === 'DocGia') {
            // Lấy thông tin Độc Giả
            userQuery = `
                SELECT MaDG, HoTen, Email, SDT, DiaChi, TrangThaiThe, NgayHetHanThe, TongPhatChuaThanhToan 
                FROM DocGia 
                WHERE MaTK = @MaTK
            `;
        } else if (taiKhoan.LoaiTK === 'ThuThu' || taiKhoan.LoaiTK === 'Admin') {
            // Lấy thông tin Thủ Thư/Admin
            userQuery = `
                SELECT MaTT, HoTen, Email, SDT, Role 
                FROM ThuThu 
                WHERE MaTK = @MaTK
            `;
        } else {
            return res.status(400).json({ message: 'Loại tài khoản không hợp lệ.' });
        }

        const detailResult = await pool.request()
            .input('MaTK', sql.VarChar, taiKhoan.MaTK)
            .query(userQuery);

        userDetail = detailResult.recordset[0];
        
        if (!userDetail) {
            console.log('❌ User detail not found for MaTK:', taiKhoan.MaTK);
            return res.status(500).json({ message: 'Lỗi hệ thống: Không tìm thấy thông tin chi tiết người dùng.' });
        }

        console.log('✅ User detail found:', userDetail);

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

        // 8. CHUẨN BỊ DỮ LIỆU PHẢN HỒI
        let responseData = {
            token: token,
            message: 'Đăng nhập thành công!'
        };

        // 9. ĐỊNH DẠNG USER DATA THEO LOẠI TÀI KHOẢN
        if (taiKhoan.LoaiTK === 'DocGia') {
            responseData.user = {
                MaDG: userDetail.MaDG,
                HoTen: userDetail.HoTen,
                Email: userDetail.Email,
                SDT: userDetail.SDT,
                DiaChi: userDetail.DiaChi,
                TrangThaiThe: userDetail.TrangThaiThe,
                NgayHetHanThe: userDetail.NgayHetHanThe,
                TongPhatChuaThanhToan: userDetail.TongPhatChuaThanhToan || 0,
                LoaiTK: taiKhoan.LoaiTK,
                MaTK: taiKhoan.MaTK,
                TenDangNhap: tenDangNhap
            };
        } else {
            responseData.user = {
                MaTT: userDetail.MaTT,
                HoTen: userDetail.HoTen,
                Email: userDetail.Email,
                SDT: userDetail.SDT,
                Role: userDetail.Role,
                LoaiTK: taiKhoan.LoaiTK,
                MaTK: taiKhoan.MaTK,
                TenDangNhap: tenDangNhap
            };
        }

        console.log('✅ Login successful for:', tenDangNhap);
        console.log('🔑 Token generated for user:', responseData.user.HoTen);

        // 10. TRẢ VỀ PHẢN HỒI THÀNH CÔNG - 200 OK
        res.status(200).json(responseData);

    } catch (err) {
        console.error('❌ Login error:', err);
        // 11. XỬ LÝ LỖI SERVER - 500 Internal Error
        res.status(500).json({ 
            message: 'Lỗi đăng nhập',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
// ============================================================
// HÀM GỬI EMAIL ĐẶT LẠI MẬT KHẨU
// ============================================================
async function sendResetEmail(email, hoTen, resetLink) {
    try {
        console.log('🔄 Attempting to send reset email to:', email);
        
        // Kiểm tra cấu hình email
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('❌ Email configuration missing - skipping email sending');
            return;
        }

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Verify connection
        await transporter.verify();
        console.log('✅ Email server connection OK');

        const mailOptions = {
            from: `"Thư Viện" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 Đặt lại mật khẩu Thư viện',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; background: linear-gradient(135deg, #f6ad55, #ed8936); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
                        <h1 style="margin: 0;">🔐 THƯ VIỆN</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Yêu cầu đặt lại mật khẩu</p>
                    </div>
                    
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #333; margin-bottom: 10px;">Xin chào ${hoTen}!</h2>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                            Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. 
                            Vui lòng nhấp vào nút bên dưới để tạo mật khẩu mới.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" 
                               style="background: linear-gradient(135deg, #f6ad55, #ed8936); 
                                      color: white; 
                                      padding: 14px 32px; 
                                      text-decoration: none; 
                                      border-radius: 8px; 
                                      display: inline-block;
                                      font-weight: bold;
                                      font-size: 16px;
                                      box-shadow: 0 4px 12px rgba(246, 173, 85, 0.3);">
                                🔑 Đặt lại mật khẩu
                            </a>
                        </div>
                        
                        <div style="background: #fef6e7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f6ad55;">
                            <p style="margin: 0; color: #744210; font-size: 14px;">
                                <strong>⚠️ Lưu ý quan trọng:</strong><br>
                                • Liên kết này sẽ hết hạn sau <strong>1 giờ</strong><br>
                                • Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email<br>
                                • Để bảo mật, không chia sẻ liên kết này với ai
                            </p>
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid #e0e0e0; padding: 20px; text-align: center; color: #999; font-size: 12px;">
                        <p style="margin: 0;">
                            Trân trọng,<br>
                            <strong>Đội ngũ Thư viện</strong>
                        </p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Reset email sent successfully to:', email);
        console.log('📧 Message ID:', info.messageId);
        
        return info;
    } catch (error) {
        console.error('❌ Error sending reset email:', error);
        throw new Error(`Không thể gửi email đặt lại mật khẩu: ${error.message}`);
    }
}

// controllers/authController.js
// ============================================================
// Hàm lấy lại mật khẩu - ĐÃ SỬA LỖI KHAI BÁO THAM SỐ TRÙNG LẶP
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
            // ... (Phần này giữ nguyên)
            await transaction.commit(); 
            return res.status(200).json({ message: 'Nếu tài khoản tồn tại, một email đặt lại mật khẩu đã được gửi.' });
        }
        
        const taiKhoan = result.recordset[0];

        // 2. Tạo Token và Thời hạn
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); 
        
        // 3. 🎯 SỬA LỖI: KHAI BÁO TẤT CẢ INPUT CHỈ MỘT LẦN TRÊN REQUEST
        request.input('MaTK', sql.VarChar, taiKhoan.MaTK);
        request.input('Token', sql.VarChar, resetToken);
        request.input('Expires', sql.DateTime, tokenExpires);
        
        // 4. Xóa Token cũ (Tái sử dụng @MaTK)
        await request.query('DELETE FROM ActivationToken WHERE MaTK = @MaTK');

        // 5. Lưu Token mới (Tái sử dụng @MaTK, @Token, @Expires)
        await request.query('INSERT INTO ActivationToken (MaTK, Token, Expires) VALUES (@MaTK, @Token, @Expires)');

        // 6. Gửi Email (Giữ nguyên)
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const hoTen = taiKhoan.LoaiTK === 'DocGia' ? 'Người dùng Thư viện' : taiKhoan.LoaiTK;
        
        await sendResetEmail(tenDangNhap, hoTen, resetLink);

        await transaction.commit();

        res.status(200).json({ 
            message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.', 
        });

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

    // Validate password strength
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = transaction.request();

        console.log('🔄 Processing password reset for token');

        // 1. Xác minh token
        const tokenResult = await request
            .input('Token', sql.VarChar, token)
            .query('SELECT MaTK, Expires FROM ActivationToken WHERE Token = @Token');

        if (tokenResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Token không hợp lệ hoặc đã được sử dụng.' });
        }

        const { MaTK, Expires } = tokenResult.recordset[0];
        
        // 2. Kiểm tra hạn token
        if (new Date() > new Date(Expires)) {
            await transaction.rollback();
            return res.status(400).json({ 
                message: 'Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.' 
            });
        }

        // 3. Hash mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 4. Cập nhật mật khẩu
        const updateResult = await request
            .input('MaTK', sql.VarChar, MaTK)
            .input('HashedPassword', sql.VarChar, hashedPassword)
            .query('UPDATE TaiKhoan SET MatKhau = @HashedPassword WHERE MaTK = @MaTK');

        if (updateResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
        }

        // 5. Xóa token đã sử dụng
        await request
            .input('Token', sql.VarChar, token)
            .query('DELETE FROM ActivationToken WHERE Token = @Token');

        await transaction.commit();

        console.log('✅ Password reset successful for MaTK:', MaTK);

        res.status(200).json({ 
            message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.' 
        });

    } catch (err) {
        console.error('❌ Reset password error:', err);
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rbErr) {
                console.error('Rollback error:', rbErr);
            }
        }
        res.status(500).json({ 
            message: 'Lỗi server khi đặt lại mật khẩu.',
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};
// ============================================================
// GET PROFILE - LẤY THÔNG TIN
// ============================================================
exports.getProfile = async (req, res) => {
    const MaNguoiDung = req.user.UserId;
    const LoaiTK = req.user.LoaiTK;

    try {
        const pool = await sql.connect(config);
        
        if (LoaiTK === 'DocGia') {
            // Lấy thông tin Độc giả
            const result = await pool.request()
                .input('MaNguoiDung', sql.VarChar, MaNguoiDung)
                .query(`
                    SELECT 
                        dg.MaDG, dg.HoTen, dg.Email, dg.SDT, dg.DiaChi, 
                        dg.TrangThaiThe, dg.NgayHetHanThe,
                        tk.MaTK, tk.LoaiTK, tk.TenDangNhap
                    FROM DocGia dg
                    INNER JOIN TaiKhoan tk ON dg.MaTK = tk.MaTK
                    WHERE dg.MaDG = @MaNguoiDung
                `);

            if (result.recordset.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin độc giả.' });
            }

            const profile = result.recordset[0];
            
            // RESPONSE CHO ĐỘC GIẢ
            res.json({
                MaDG: profile.MaDG,
                HoTen: profile.HoTen,
                Email: profile.Email,
                SDT: profile.SDT,
                DiaChi: profile.DiaChi,
                TrangThaiThe: profile.TrangThaiThe,
                NgayHetHanThe: profile.NgayHetHanThe,
                MaTK: profile.MaTK,
                LoaiTK: profile.LoaiTK,
                TenDangNhap: profile.TenDangNhap
            });

        } else {
            // Lấy thông tin Thủ thư/Admin
            const result = await pool.request()
                .input('MaNguoiDung', sql.VarChar, MaNguoiDung)
                .query(`
                    SELECT 
                        tt.MaTT, tt.HoTen, tt.Email, tt.SDT, tt.Role,
                        tk.MaTK, tk.LoaiTK, tk.TenDangNhap
                    FROM ThuThu tt
                    INNER JOIN TaiKhoan tk ON tt.MaTK = tk.MaTK
                    WHERE tt.MaTT = @MaNguoiDung
                `);

            if (result.recordset.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin thủ thư.' });
            }

            const profile = result.recordset[0];
            
            // RESPONSE CHO THỦ THƯ/ADMIN
            res.json({
                MaTT: profile.MaTT,
                HoTen: profile.HoTen,
                Email: profile.Email,
                SDT: profile.SDT,
                Role: profile.Role,
                MaTK: profile.MaTK,
                LoaiTK: profile.LoaiTK,
                TenDangNhap: profile.TenDangNhap
            });
        }

    } catch (err) {
        console.error('Lỗi khi lấy profile:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy profile.', error: err.message });
    }
};

// ============================================================
// UPDATE PROFILE - CẬP NHẬT THÔNG TIN
// ============================================================
exports.updateProfile = async (req, res) => {
    const MaNguoiDung = req.user.UserId;
    const LoaiTK = req.user.LoaiTK;
    const { HoTen, SDT, DiaChi } = req.body;

    console.log('Update profile request:', { MaNguoiDung, LoaiTK, HoTen, SDT, DiaChi });

    // Validation
    if (!HoTen || !HoTen.trim()) {
        return res.status(400).json({ message: 'Họ tên không được để trống.' });
    }
    
    if (SDT && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(SDT)) {
        return res.status(400).json({ message: 'Số điện thoại không hợp lệ.' });
    }

    try {
        const pool = await sql.connect(config);
        
        if (LoaiTK === 'DocGia') {
            // Cập nhật cho Độc giả - LOẠI BỎ NgayCapNhat
            const result = await pool.request()
                .input('MaDG', sql.VarChar, MaNguoiDung)
                .input('HoTen', sql.NVarChar, HoTen.trim())
                .input('SDT', sql.VarChar, SDT ? SDT.trim() : null)
                .input('DiaChi', sql.NVarChar, DiaChi ? DiaChi.trim() : null)
                .query(`
                    UPDATE DocGia 
                    SET 
                        HoTen = @HoTen, 
                        SDT = @SDT, 
                        DiaChi = @DiaChi
                    WHERE MaDG = @MaDG
                `);

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ message: 'Không tìm thấy độc giả để cập nhật.' });
            }

        } else {
            // Cập nhật cho Thủ thư - LOẠI BỎ NgayCapNhat
            const result = await pool.request()
                .input('MaTT', sql.VarChar, MaNguoiDung)
                .input('SDT', sql.VarChar, SDT ? SDT.trim() : null)
                .query(`
                    UPDATE ThuThu 
                    SET SDT = @SDT
                    WHERE MaTT = @MaTT
                `);

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ message: 'Không tìm thấy thủ thư để cập nhật.' });
            }
        }

        // RESPONSE SUCCESS
        res.status(200).json({ 
            message: 'Cập nhật thông tin thành công.'
        });

    } catch (err) {
        console.error('Lỗi khi cập nhật profile:', err);
        res.status(500).json({ 
            message: 'Lỗi server khi cập nhật profile.', 
            error: err.message 
        });
    }
};