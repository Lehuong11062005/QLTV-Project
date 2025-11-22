-- 1. TẠO DATABASE VÀ SỬ DỤNG
CREATE DATABASE QLTV;
GO
USE QLTV;
GO

-- =============================================
-- I. NHÓM TÀI KHOẢN & NGƯỜI DÙNG (Tạo trước để làm gốc)
-- =============================================

-- 1. Bảng Tài Khoản (Gốc của mọi user)
CREATE TABLE TaiKhoan (
    MaTK VARCHAR(10) PRIMARY KEY,
    TenDangNhap VARCHAR(50) NOT NULL UNIQUE,
    MatKhau VARCHAR(255) NOT NULL,
    LoaiTK VARCHAR(20), -- Admin, ThuThu, DocGia
    TrangThai VARCHAR(20), -- HoatDong, BiKhoa, ChoXacThuc
    NgayTao DATETIME DEFAULT GETDATE()
);

-- 2. Bảng Độc Giả
CREATE TABLE DocGia (
    MaDG VARCHAR(10) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    DiaChi NVARCHAR(255),
    SDT VARCHAR(15),
    Email VARCHAR(100) UNIQUE,
    NgayHetHanThe DATE,
    TrangThaiThe NVARCHAR(50), -- ConHan, ChoKichHoat
    MaTK VARCHAR(10) UNIQUE, -- 1 Tài khoản chỉ gắn 1 Độc giả
    TongPhatChuaThanhToan DECIMAL(18, 0) DEFAULT 0,
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK)
);

-- 3. Bảng Thủ Thư (Nhân viên)
CREATE TABLE ThuThu (
    MaTT VARCHAR(10) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    SDT VARCHAR(15),
    Email VARCHAR(100),
    MaTK VARCHAR(10) UNIQUE,
    Role NVARCHAR(50), -- QuanLy, ThuThu
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK)
);

-- 4. Token Kích hoạt tài khoản
CREATE TABLE ActivationToken (
    MaTK VARCHAR(10) PRIMARY KEY,
    Token VARCHAR(255) NOT NULL,
    Expires DATETIME NOT NULL,
    MaDG VARCHAR(10), -- Link đến độc giả nếu cần tracking
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK)
);

-- 5. Token Quên mật khẩu
CREATE TABLE ResetToken (
    MaTK VARCHAR(10) PRIMARY KEY,
    Token VARCHAR(255) NOT NULL,
    NgayHetHan DATETIME NOT NULL,
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK)
);

-- =============================================
-- II. NHÓM SÁCH & KHO (Tạo tiếp theo)
-- =============================================

-- 6. Tác Giả
CREATE TABLE TacGia (
    MaTG VARCHAR(10) PRIMARY KEY,
    TenTG NVARCHAR(100) NOT NULL
);

-- 7. Danh Mục
CREATE TABLE DanhMuc (
    MaDM VARCHAR(10) PRIMARY KEY,
    TenDM NVARCHAR(100) NOT NULL
);

-- 8. Sách (Thông tin chung)
CREATE TABLE Sach (
    MaSach VARCHAR(10) PRIMARY KEY,
    TenSach NVARCHAR(200) NOT NULL,
    MoTa NVARCHAR(500),
    NamXuatBan INT,
    AnhMinhHoa NVARCHAR(255),
    GiaBan DECIMAL(18, 0),
    DonViTinh NVARCHAR(20),
    SoLuongTon INT DEFAULT 0,
    TinhTrang NVARCHAR(50), -- Con, Het
    MaTG VARCHAR(10),
    MaDM VARCHAR(10),
    FOREIGN KEY (MaTG) REFERENCES TacGia(MaTG),
    FOREIGN KEY (MaDM) REFERENCES DanhMuc(MaDM)
);

-- 9. Bản Sao Thư Viện (Quản lý từng cuốn sách cụ thể trên kệ)
CREATE TABLE BanSao_ThuVien (
    MaBanSao VARCHAR(15) PRIMARY KEY, -- Mã vạch/Mã cá biệt
    MaSach VARCHAR(10),
    ViTriKe NVARCHAR(20),
    TrangThaiBanSao NVARCHAR(50), -- SanSang, DangMuon, HuHong, Mat
    FOREIGN KEY (MaSach) REFERENCES Sach(MaSach)
);

-- =============================================
-- III. NHÓM MƯỢN TRẢ (Core Feature)
-- =============================================

-- 10. Giỏ Mượn (Lưu sách độc giả chọn trước khi tạo phiếu mượn)
CREATE TABLE GioMuon (
    MaGM VARCHAR(10) PRIMARY KEY,
    MaDG VARCHAR(10) NOT NULL,
    NgayTao DATETIME DEFAULT GETDATE(),
    TongSoLuong INT,
    FOREIGN KEY (MaDG) REFERENCES DocGia(MaDG)
);

-- 11. Chi tiết Giỏ Mượn
CREATE TABLE GioMuon_Sach (
    MaGM VARCHAR(10),
    MaSach VARCHAR(10),
    SoLuong INT NOT NULL,
    PRIMARY KEY (MaGM, MaSach),
    FOREIGN KEY (MaGM) REFERENCES GioMuon(MaGM),
    FOREIGN KEY (MaSach) REFERENCES Sach(MaSach)
);

-- 12. Phiếu Mượn Sách
CREATE TABLE MuonSach (
    MaMuon VARCHAR(10) PRIMARY KEY,
    MaDG VARCHAR(10),
    MaTT_ChoMuon VARCHAR(10),
    NgayMuon DATE,
    HanTra DATE,
    TrangThai NVARCHAR(50), -- ChoDuyet, DaDuyet, DaTraHet, QuaHan
    FOREIGN KEY (MaDG) REFERENCES DocGia(MaDG),
    FOREIGN KEY (MaTT_ChoMuon) REFERENCES ThuThu(MaTT)
);

-- 13. Chi tiết Mượn (Mượn cuốn nào, bản sao nào)
CREATE TABLE MuonSach_Sach (
    MaMuon VARCHAR(10),
    MaBanSao VARCHAR(15),
    PRIMARY KEY (MaMuon, MaBanSao),
    FOREIGN KEY (MaMuon) REFERENCES MuonSach(MaMuon),
    FOREIGN KEY (MaBanSao) REFERENCES BanSao_ThuVien(MaBanSao)
);

-- 14. Phiếu Trả Sách
CREATE TABLE TraSach (
    MaTra VARCHAR(10) PRIMARY KEY,
    MaMuon VARCHAR(10) UNIQUE, -- 1 Phiếu mượn chỉ có 1 phiếu trả tổng (hoặc n lần trả)
    MaTT_NhanTra VARCHAR(10),
    NgayTra DATE,
    TongTienPhat DECIMAL(18, 0),
    FOREIGN KEY (MaMuon) REFERENCES MuonSach(MaMuon),
    FOREIGN KEY (MaTT_NhanTra) REFERENCES ThuThu(MaTT)
);

-- 15. Chi tiết Trả (Tình trạng từng cuốn khi trả)
CREATE TABLE TraSach_Sach (
    MaTra VARCHAR(10),
    MaBanSao VARCHAR(15),
    TienPhatQuaHan DECIMAL(18, 0),
    TienDenBu DECIMAL(18, 0),
    LyDoPhat NVARCHAR(255),
    PRIMARY KEY (MaTra, MaBanSao),
    FOREIGN KEY (MaTra) REFERENCES TraSach(MaTra),
    FOREIGN KEY (MaBanSao) REFERENCES BanSao_ThuVien(MaBanSao)
);

-- =============================================
-- IV. NHÓM MUA BÁN (E-Commerce Feature)
-- =============================================

-- 16. Giỏ Hàng (Mua sách)
CREATE TABLE GioHang (
    MaGH VARCHAR(10) PRIMARY KEY,
    MaDG VARCHAR(10) UNIQUE, -- Mỗi độc giả 1 giỏ hàng
    TamTinh DECIMAL(18, 0),
    FOREIGN KEY (MaDG) REFERENCES DocGia(MaDG)
);

-- 17. Chi tiết Giỏ Hàng
CREATE TABLE GioHang_Sach (
    MaGH VARCHAR(10),
    MaSach VARCHAR(10),
    SoLuong INT NOT NULL,
    PRIMARY KEY (MaGH, MaSach),
    FOREIGN KEY (MaGH) REFERENCES GioHang(MaGH),
    FOREIGN KEY (MaSach) REFERENCES Sach(MaSach)
);

-- 18. Đơn Hàng
CREATE TABLE DonHang (
    MaDH VARCHAR(10) PRIMARY KEY,
    MaDG VARCHAR(10),
    NgayTao DATETIME DEFAULT GETDATE(),
    TongTien DECIMAL(18, 0),
    DiaChiGiaoHang NVARCHAR(255),
    TrangThai NVARCHAR(50), -- ChoDuyet, DangGiao, HoanThanh
    HinhThucThanhToan NVARCHAR(50),
    TrangThaiThanhToan NVARCHAR(50), -- ChuaThanhToan, DaThanhToan
    PhiVanChuyen DECIMAL(18, 0),
    MaVanDon VARCHAR(50),
    FOREIGN KEY (MaDG) REFERENCES DocGia(MaDG)
);

-- 19. Chi tiết Đơn Hàng
CREATE TABLE DonHang_Sach (
    MaDH_Sach INT IDENTITY(1,1) PRIMARY KEY,
    MaDH VARCHAR(10),
    MaSach VARCHAR(10),
    SoLuong INT NOT NULL,
    DonGia DECIMAL(18, 0), -- Lưu giá tại thời điểm mua
    FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH),
    FOREIGN KEY (MaSach) REFERENCES Sach(MaSach)
);

-- 20. Thanh Toán
CREATE TABLE ThanhToan (
    MaTT VARCHAR(10) PRIMARY KEY, -- Mã thanh toán
    MaDH VARCHAR(10),
    MaPhat VARCHAR(10), -- Nếu thanh toán phạt (Optional)
    PhuongThuc NVARCHAR(50),
    SoTien DECIMAL(18, 0),
    TrangThai NVARCHAR(50), -- KhoiTao, HoanThanh, Loi
    MaGiaoDich VARCHAR(100), -- ID từ VNPay/Momo
    NgayThanhToan DATETIME,
    NoiDung NVARCHAR(255),
    LoaiGiaoDich NVARCHAR(20), -- DonHang, PhiPhat
    FOREIGN KEY (MaDH) REFERENCES DonHang(MaDH)
);

-- =============================================
-- V. NHÓM TƯƠNG TÁC & PHẢN HỒI
-- =============================================

-- 21. Phản Hồi (Khiếu nại/Góp ý hệ thống)
CREATE TABLE PhanHoi (
    MaPH VARCHAR(10) PRIMARY KEY,
    MaDG VARCHAR(10) NOT NULL,
    NoiDung NVARCHAR(1000) NOT NULL,
    NgayGui DATETIME DEFAULT GETDATE(),
    TrangThai NVARCHAR(50), -- Chưa xử lý, Đã xử lý
    MaTT_XuLy VARCHAR(10),
    FOREIGN KEY (MaDG) REFERENCES DocGia(MaDG),
    FOREIGN KEY (MaTT_XuLy) REFERENCES ThuThu(MaTT)
);

-- 22. Đánh Giá Sách (Review sách)
CREATE TABLE DanhGiaSach (
    MaDGia INT IDENTITY(1,1) PRIMARY KEY,
    MaSach VARCHAR(10) NOT NULL,
    MaDG VARCHAR(10) NOT NULL,
    DiemDanhGia INT CHECK (DiemDanhGia >= 1 AND DiemDanhGia <= 5),
    NoiDung NVARCHAR(1000),
    NgayDanhGia DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (MaSach) REFERENCES Sach(MaSach),
    FOREIGN KEY (MaDG) REFERENCES DocGia(MaDG)
);