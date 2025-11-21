-- ============================================================
-- CSDL: QUANLYTHUVIEN (HOÀN THIỆN NHẤT)
-- Bổ sung Mã cá biệt, Phí phạt, Vận chuyển để đảm bảo hoạt động
-- ============================================================
-- Lưu ý còn một bảng active token cho kích hoạt tài khoản có thể thêm sau
-- BƯỚC 1: XÓA CSDL CŨ (NẾU TỒN TẠI)
IF DB_ID(N'QuanLyThuVien') IS NOT NULL
BEGIN
    USE master;
    ALTER DATABASE QuanLyThuVien SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE QuanLyThuVien;
END
GO

-- BƯỚC 2: TẠO CSDL MỚI
CREATE DATABASE QuanLyThuVien;
GO

USE QuanLyThuVien;
GO

-- ============================================================
-- BƯỚC 3: BẢNG TÀI KHOẢN VÀ NGƯỜI DÙNG
-- ============================================================

CREATE TABLE TaiKhoan (
    MaTK VARCHAR(10) PRIMARY KEY,
    TenDangNhap VARCHAR(50) UNIQUE NOT NULL, -- Thường là Email
    MatKhau VARCHAR(255) NOT NULL, -- Cần được mã hóa (hashed)
    LoaiTK VARCHAR(20), -- Admin, ThuThu, DocGia
    TrangThai VARCHAR(20) DEFAULT 'HoatDong', -- HoatDong, BiKhoa (Dùng cho cả tài khoản bị khóa do nợ phí)
    NgayTao DATETIME DEFAULT GETDATE()
);
GO

CREATE TABLE ThuThu (
    MaTT VARCHAR(10) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    SDT VARCHAR(15),
    Email VARCHAR(100),
    MaTK VARCHAR(10) UNIQUE,
    Role NVARCHAR(50) DEFAULT N'ThuThu', -- QuanLy (Super Admin) hoặc ThuThu (Vận hành)
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK)
);
GO

CREATE TABLE DocGia (
    MaDG VARCHAR(10) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    DiaChi NVARCHAR(255),
    SDT VARCHAR(15),
    Email VARCHAR(100) UNIQUE,
    NgayHetHanThe DATE,
    TrangThaiThe NVARCHAR(50) DEFAULT N'ConHan',
    MaTK VARCHAR(10) UNIQUE,
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK)
);
GO

-- BỔ SUNG: Theo dõi Phí Phạt chưa thanh toán
ALTER TABLE DocGia
ADD TongPhatChuaThanhToan DECIMAL(18, 0) DEFAULT 0;
GO

-- BỔ SUNG: Bảng lưu trữ Token đặt lại Mật khẩu
CREATE TABLE ResetToken (
    MaTK VARCHAR(10) PRIMARY KEY,
    Token VARCHAR(255) NOT NULL,
    NgayHetHan DATETIME NOT NULL, -- Token phải có thời hạn ngắn (VD: 30 phút)
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK)
);
GO

-- ============================================================
-- BƯỚC 4: BẢNG DANH MỤC, TÁC GIẢ, SÁCH & BẢN SAO
-- ============================================================

CREATE TABLE TacGia (
    MaTG VARCHAR(10) PRIMARY KEY,
    TenTG NVARCHAR(100) NOT NULL
);
GO

CREATE TABLE DanhMuc (
    MaDM VARCHAR(10) PRIMARY KEY,
    TenDM NVARCHAR(100) NOT NULL
);
GO

-- Bảng Sách (Thông tin chung của sách)
CREATE TABLE Sach (
    MaSach VARCHAR(10) PRIMARY KEY,
    TenSach NVARCHAR(200) NOT NULL,
    MoTa NVARCHAR(500),
    NamXuatBan INT,
    AnhMinhHoa NVARCHAR(255),
    GiaBan DECIMAL(18, 0), -- Giá bán chung (áp dụng cho sách bán)
    DonViTinh NVARCHAR(20),
    SoLuongTon INT NOT NULL CHECK (SoLuongTon >= 0), -- Tổng tồn kho (Bán + Mượn)
    TinhTrang NVARCHAR(50) DEFAULT N'Còn',
    MaTG VARCHAR(10),
    MaDM VARCHAR(10),
    FOREIGN KEY (MaTG) REFERENCES TacGia(MaTG),
    FOREIGN KEY (MaDM) REFERENCES DanhMuc(MaDM)
);
GO

-- BỔ SUNG BẮT BUỘC: Bảng BanSao_ThuVien (Quản lý Mã cá biệt cho sách cho MƯỢN)
CREATE TABLE BanSao_ThuVien (
    MaBanSao VARCHAR(15) PRIMARY KEY, -- MÃ CÁ BIỆT (Asset Tag/Barcode)
    MaSach VARCHAR(10),
    ViTriKe NVARCHAR(20),
    TrangThaiBanSao NVARCHAR(50) DEFAULT N'SanSang', -- SanSang, DangMuon, HuHong, Mat
    FOREIGN KEY (MaSach) REFERENCES Sach(MaSach)
);
GO

-- ============================================================
-- BƯỚC 5: GIỎ HÀNG MUA
-- ============================================================

CREATE TABLE GioHang (
    MaGH VARCHAR(10) PRIMARY KEY,
    MaDG VARCHAR(10) UNIQUE,
    TamTinh DECIMAL(18, 0) DEFAULT 0,
    FOREIGN KEY (MaDG) REFERENCES DocGia(MaDG)
);

CREATE TABLE GioHang_Sach (
    MaGH VARCHAR(10),
    MaSach VARCHAR(10),
    SoLuong INT NOT NULL CHECK (SoLuong > 0),
    PRIMARY KEY (MaGH, MaSach),
    FOREIGN KEY (MaGH) REFERENCES GioHang(MaGH),
    FOREIGN KEY (MaSach) REFERENCES Sach(MaSach)
);
GO

-- ============================================================
-- BƯỚC 6: ĐƠN HÀNG MUA SÁCH (Bổ sung Vận chuyển)
-- ============================================================
CREATE TABLE DonHang (
    MaDH VARCHAR(10) PRIMARY KEY,
    MaDG VARCHAR(10),
    NgayTao DATETIME DEFAULT GETDATE(),
    TongTien DECIMAL(18, 0) DEFAULT 0,
    DiaChiGiaoHang NVARCHAR(255),
    TrangThai NVARCHAR(50) DEFAULT N'ChoDuyet',
    HinhThucThanhToan NVARCHAR(50),
    TrangThaiThanhToan NVARCHAR(50) DEFAULT N'ChuaThanhToan',
    -- Loại bỏ MaChuyenKhoan
    FOREIGN KEY (MaDG) REFERENCES DocGia(MaDG)
);
GO

-- BỔ SUNG BẮT BUỘC: Thông tin Vận chuyển vào DonHang
ALTER TABLE DonHang
    ADD PhiVanChuyen DECIMAL(18, 0) DEFAULT 0,
    MaVanDon VARCHAR(50);
GO

CREATE TABLE DonHang_Sach (
    MaDH_Sach INT IDENTITY(1,1) PRIMARY KEY,
    MaDH VARCHAR(10),
    MaSach VARCHAR(10),
    SoLuong INT NOT NULL CHECK (SoLuong > 0),
    DonGia DECIMAL(18, 0) NOT NULL,
    FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH),
    FOREIGN KEY (MaSach) REFERENCES Sach(MaSach)
);
GO

-- ============================================================
-- BƯỚC 7: THANH TOÁN (Bổ sung Phân loại giao dịch)
-- ============================================================
CREATE TABLE ThanhToan (
    MaTT VARCHAR(10) PRIMARY KEY,
    MaDH VARCHAR(10), 
    MaPhat VARCHAR(10), -- Mã Phiếu phạt (dùng cho thanh toán phí phạt)
    PhuongThuc NVARCHAR(50), 
    SoTien DECIMAL(18,0),
    TrangThai NVARCHAR(50) DEFAULT N'KhoiTao',
    MaGiaoDich VARCHAR(100),
    NgayThanhToan DATETIME DEFAULT GETDATE(),
    NoiDung NVARCHAR(255),
    LoaiGiaoDich NVARCHAR(20) NOT NULL DEFAULT N'DonHang', -- BỔ SUNG: Phân loại: DonHang, PhiPhat
    FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH)
    -- Giả định MaPhat sẽ là FK tới bảng Phat (nếu có)
);
GO

-- ============================================================
-- BƯỚC 8: MƯỢN / TRẢ SÁCH (Sửa để dùng Mã cá biệt)
-- ============================================================

CREATE TABLE MuonSach (
    MaMuon VARCHAR(10) PRIMARY KEY,
    MaDG VARCHAR(10),
    MaTT_ChoMuon VARCHAR(10),
    NgayMuon DATE DEFAULT GETDATE(),
    HanTra DATE,
    TrangThai NVARCHAR(50) DEFAULT N'ChoDuyet', -- ChoDuyet, DaDuyet, DaTraHet, QuaHan
    FOREIGN KEY (MaDG) REFERENCES DocGia(MaDG),
    FOREIGN KEY (MaTT_ChoMuon) REFERENCES ThuThu(MaTT)
);

-- SỬA ĐỔI BẮT BUỘC: Dùng MaBanSao thay cho MaSach
CREATE TABLE MuonSach_Sach (
    MaMuon VARCHAR(10),
    MaBanSao VARCHAR(15), -- Dùng Mã cá biệt
    PRIMARY KEY (MaMuon, MaBanSao),
    FOREIGN KEY (MaMuon) REFERENCES MuonSach(MaMuon),
    FOREIGN KEY (MaBanSao) REFERENCES BanSao_ThuVien(MaBanSao)
);
GO

CREATE TABLE TraSach (
    MaTra VARCHAR(10) PRIMARY KEY,
    MaMuon VARCHAR(10) UNIQUE,
    MaTT_NhanTra VARCHAR(10),
    NgayTra DATE DEFAULT GETDATE(),
    TongTienPhat DECIMAL(18, 0) DEFAULT 0,
    FOREIGN KEY (MaMuon) REFERENCES MuonSach(MaMuon),
    FOREIGN KEY (MaTT_NhanTra) REFERENCES ThuThu(MaTT)
);

-- SỬA ĐỔI BẮT BUỘC: Dùng MaBanSao thay cho MaSach và Bổ sung Tiền Đền bù
CREATE TABLE TraSach_Sach (
    MaTra VARCHAR(10),
    MaBanSao VARCHAR(15), -- Dùng Mã cá biệt
    TienPhatQuaHan DECIMAL(18, 0) DEFAULT 0, -- Tách riêng tiền phạt quá hạn
    TienDenBu DECIMAL(18, 0) DEFAULT 0, -- BỔ SUNG: Tiền đền bù nếu sách hỏng/mất
    LyDoPhat NVARCHAR(255),
    PRIMARY KEY (MaTra, MaBanSao),
    FOREIGN KEY (MaTra) REFERENCES TraSach(MaTra),
    FOREIGN KEY (MaBanSao) REFERENCES BanSao_ThuVien(MaBanSao)
);
GO

-- ============================================================
-- BƯỚC 9: PHẢN HỒI NGƯỜI DÙNG & ĐÁNH GIÁ SÁCH
-- ============================================================

CREATE TABLE PhanHoi (
    MaPH VARCHAR(10) PRIMARY KEY,
    MaDG VARCHAR(10) NOT NULL,
    NoiDung NVARCHAR(1000) NOT NULL,
    NgayGui DATETIME DEFAULT GETDATE(),
    TrangThai NVARCHAR(50) DEFAULT N'Chưa xử lý', -- Dùng cho phản hồi dịch vụ
    MaTT_XuLy VARCHAR(10),
    FOREIGN KEY (MaDG) REFERENCES DocGia(MaDG),
    FOREIGN KEY (MaTT_XuLy) REFERENCES ThuThu(MaTT)
);
GO

-- BỔ SUNG: Bảng Đánh giá/Review sách
CREATE TABLE DanhGiaSach (
    MaDGia INT IDENTITY(1,1) PRIMARY KEY,
    MaSach VARCHAR(10) NOT NULL,
    MaDG VARCHAR(10) NOT NULL,
    DiemDanhGia INT CHECK (DiemDanhGia BETWEEN 1 AND 5), -- 1 đến 5 sao
    NoiDung NVARCHAR(1000),
    NgayDanhGia DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (MaSach) REFERENCES Sach(MaSach),
    FOREIGN KEY (MaDG) REFERENCES DocGia(MaDG),
    UNIQUE (MaSach, MaDG) -- Mỗi độc giả chỉ đánh giá 1 lần trên 1 cuốn
);
GO

-- ============================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================

SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO