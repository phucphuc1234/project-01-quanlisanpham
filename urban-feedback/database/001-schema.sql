/* =========================================================
   NỀN TẢNG QUẢN LÝ PHẢN ÁNH HẠ TẦNG ĐÔ THỊ
   SQL Server - CSDL chuẩn hóa theo UC01 -> UC16
   Kiến trúc ứng dụng: UI -> Service -> Data
   ========================================================= */

IF DB_ID(N'QuanLyPhanAnhHaTangDoThi') IS NULL
BEGIN
    CREATE DATABASE QuanLyPhanAnhHaTangDoThi;
END
GO

USE QuanLyPhanAnhHaTangDoThi;
GO

/*
LƯU Ý:
- Script này là schema chuẩn cho CSDL sạch.
- Nếu DB hiện tại đã có bảng cũ, hãy BACKUP trước rồi tạo DB mới/đổi tên DB cũ.
- Không tự DROP DATABASE để tránh mất dữ liệu.
*/

-- ============================================================
-- 1. VAI TRÒ
-- ============================================================
CREATE TABLE dbo.VaiTro
(
    MaVaiTro   VARCHAR(10)   NOT NULL,
    TenVaiTro  NVARCHAR(100) NOT NULL,
    MoTa       NVARCHAR(255) NULL,
    TrangThai  BIT NOT NULL CONSTRAINT DF_VaiTro_TrangThai DEFAULT (1),

    CONSTRAINT PK_VaiTro PRIMARY KEY (MaVaiTro),
    CONSTRAINT UQ_VaiTro_TenVaiTro UNIQUE (TenVaiTro)
);
GO

-- ============================================================
-- 2. ĐƠN VỊ XỬ LÝ
-- ============================================================
CREATE TABLE dbo.DonViXuLy
(
    MaDonVi      VARCHAR(20)   NOT NULL,
    TenDonVi     NVARCHAR(150) NOT NULL,
    LoaiDonVi    NVARCHAR(100) NULL,
    DiaChi       NVARCHAR(255) NULL,
    SoDienThoai  VARCHAR(20)   NULL,
    Email        VARCHAR(150)  NULL,
    TrangThai    BIT NOT NULL CONSTRAINT DF_DonViXuLy_TrangThai DEFAULT (1),

    CONSTRAINT PK_DonViXuLy PRIMARY KEY (MaDonVi),
    CONSTRAINT UQ_DonViXuLy_TenDonVi UNIQUE (TenDonVi)
);
GO

CREATE UNIQUE INDEX UX_DonViXuLy_SoDienThoai
ON dbo.DonViXuLy(SoDienThoai)
WHERE SoDienThoai IS NOT NULL;
GO

CREATE UNIQUE INDEX UX_DonViXuLy_Email
ON dbo.DonViXuLy(Email)
WHERE Email IS NOT NULL;
GO

-- ============================================================
-- 3. NGƯỜI DÙNG - UC01, UC02
-- ============================================================
CREATE TABLE dbo.NguoiDung
(
    MaNguoiDung  VARCHAR(20)   NOT NULL,
    MaVaiTro     VARCHAR(10)   NOT NULL,
    MaDonVi      VARCHAR(20)   NULL,
    HoTen        NVARCHAR(120) NOT NULL,
    Email        VARCHAR(150)  NOT NULL,
    SoDienThoai  VARCHAR(20)   NOT NULL,
    MatKhau      VARCHAR(255)  NOT NULL,
    DiaChi       NVARCHAR(255) NULL,
    TrangThai    BIT NOT NULL CONSTRAINT DF_NguoiDung_TrangThai DEFAULT (1),
    NgayTao      DATETIME2(0) NOT NULL CONSTRAINT DF_NguoiDung_NgayTao DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_NguoiDung PRIMARY KEY (MaNguoiDung),
    CONSTRAINT UQ_NguoiDung_Email UNIQUE (Email),
    CONSTRAINT UQ_NguoiDung_SoDienThoai UNIQUE (SoDienThoai),

    CONSTRAINT FK_NguoiDung_VaiTro
        FOREIGN KEY (MaVaiTro) REFERENCES dbo.VaiTro(MaVaiTro),

    CONSTRAINT FK_NguoiDung_DonViXuLy
        FOREIGN KEY (MaDonVi) REFERENCES dbo.DonViXuLy(MaDonVi),

    CONSTRAINT CK_NguoiDung_VT03_CoDonVi
        CHECK (MaVaiTro <> 'VT03' OR MaDonVi IS NOT NULL)
);
GO

CREATE INDEX IX_NguoiDung_MaVaiTro ON dbo.NguoiDung(MaVaiTro);
CREATE INDEX IX_NguoiDung_MaDonVi  ON dbo.NguoiDung(MaDonVi);
GO

-- ============================================================
-- 4. LOẠI PHẢN ÁNH - UC15
-- ============================================================
CREATE TABLE dbo.LoaiPhanAnh
(
    MaLoai     VARCHAR(20)   NOT NULL,
    TenLoai    NVARCHAR(150) NOT NULL,
    MoTa       NVARCHAR(500) NULL,
    TrangThai  BIT NOT NULL CONSTRAINT DF_LoaiPhanAnh_TrangThai DEFAULT (1),

    CONSTRAINT PK_LoaiPhanAnh PRIMARY KEY (MaLoai),
    CONSTRAINT UQ_LoaiPhanAnh_TenLoai UNIQUE (TenLoai)
);
GO

-- ============================================================
-- 5. PHẢN ÁNH - UC03, UC05, UC08 -> UC14
-- ============================================================
CREATE TABLE dbo.PhanAnh
(
    MaPhanAnh    VARCHAR(20)    NOT NULL,
    MaNguoiDung  VARCHAR(20)    NOT NULL,
    MaLoai       VARCHAR(20)    NOT NULL,
    TieuDe       NVARCHAR(200)  NOT NULL,
    NoiDung      NVARCHAR(MAX)  NOT NULL,
    ViTri        NVARCHAR(255)  NOT NULL,
    ToaDo        VARCHAR(100)   NULL,
    NgayGui      DATETIME2(0) NOT NULL CONSTRAINT DF_PhanAnh_NgayGui DEFAULT (SYSDATETIME()),
    TrangThai    VARCHAR(30) NOT NULL CONSTRAINT DF_PhanAnh_TrangThai DEFAULT ('SUBMITTED'),
    MucDoUuTien  VARCHAR(20) NOT NULL CONSTRAINT DF_PhanAnh_MucDoUuTien DEFAULT ('NORMAL'),
    LyDoTuChoi   NVARCHAR(1000) NULL,

    CONSTRAINT PK_PhanAnh PRIMARY KEY (MaPhanAnh),

    CONSTRAINT FK_PhanAnh_NguoiDung
        FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung(MaNguoiDung),

    CONSTRAINT FK_PhanAnh_LoaiPhanAnh
        FOREIGN KEY (MaLoai) REFERENCES dbo.LoaiPhanAnh(MaLoai),

    CONSTRAINT CK_PhanAnh_TrangThai CHECK
    (
        TrangThai IN
        ('SUBMITTED','VERIFIED','REJECTED','ASSIGNED','IN_PROGRESS',
         'WAITING_ACCEPTANCE','CLOSED','REOPENED')
    ),

    CONSTRAINT CK_PhanAnh_MucDoUuTien CHECK
    (MucDoUuTien IN ('LOW','NORMAL','HIGH','URGENT'))
);
GO

CREATE INDEX IX_PhanAnh_NguoiDung ON dbo.PhanAnh(MaNguoiDung, NgayGui DESC);
CREATE INDEX IX_PhanAnh_TrangThai ON dbo.PhanAnh(TrangThai, NgayGui DESC);
CREATE INDEX IX_PhanAnh_Loai ON dbo.PhanAnh(MaLoai, TrangThai, NgayGui DESC);
GO

-- ============================================================
-- 6. HÌNH ẢNH PHẢN ÁNH - UC03, UC08, UC13
-- ============================================================
CREATE TABLE dbo.HinhAnhPhanAnh
(
    MaHinhAnh    VARCHAR(20)   NOT NULL,
    MaPhanAnh    VARCHAR(20)   NOT NULL,
    DuongDan     NVARCHAR(500) NOT NULL,
    MoTa         NVARCHAR(255) NULL,
    LoaiAnh      VARCHAR(30) NOT NULL CONSTRAINT DF_HinhAnhPhanAnh_LoaiAnh DEFAULT ('SU_CO'),
    ThoiGianTao  DATETIME2(0) NOT NULL CONSTRAINT DF_HinhAnhPhanAnh_ThoiGianTao DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_HinhAnhPhanAnh PRIMARY KEY (MaHinhAnh),
    CONSTRAINT FK_HinhAnhPhanAnh_PhanAnh
        FOREIGN KEY (MaPhanAnh) REFERENCES dbo.PhanAnh(MaPhanAnh),
    CONSTRAINT CK_HinhAnhPhanAnh_LoaiAnh
        CHECK (LoaiAnh IN ('SU_CO','TRUOC_XU_LY','SAU_XU_LY','KHAC'))
);
GO

CREATE INDEX IX_HinhAnhPhanAnh_MaPhanAnh ON dbo.HinhAnhPhanAnh(MaPhanAnh);
GO

-- ============================================================
-- 7. KIỂM TRA TRÙNG - UC04
-- ============================================================
CREATE TABLE dbo.KiemTraTrung
(
    MaKiemTra          VARCHAR(20)   NOT NULL,
    MaPhanAnhNguon     VARCHAR(20)   NULL,
    MaPhanAnhTuongTu   VARCHAR(20)   NULL,
    MaLoai             VARCHAR(20)   NOT NULL,
    NguoiKiemTra       VARCHAR(20)   NULL,
    ViTri              NVARCHAR(255) NOT NULL,
    ThoiGianKiemTra    DATETIME2(0) NOT NULL CONSTRAINT DF_KiemTraTrung_ThoiGian DEFAULT (SYSDATETIME()),
    MucDoTuongTu       DECIMAL(5,2)  NULL,
    KetQua             VARCHAR(20)   NOT NULL,
    GhiChu             NVARCHAR(500) NULL,

    CONSTRAINT PK_KiemTraTrung PRIMARY KEY (MaKiemTra),
    CONSTRAINT FK_KiemTraTrung_PhanAnhNguon
        FOREIGN KEY (MaPhanAnhNguon) REFERENCES dbo.PhanAnh(MaPhanAnh),
    CONSTRAINT FK_KiemTraTrung_PhanAnhTuongTu
        FOREIGN KEY (MaPhanAnhTuongTu) REFERENCES dbo.PhanAnh(MaPhanAnh),
    CONSTRAINT FK_KiemTraTrung_Loai
        FOREIGN KEY (MaLoai) REFERENCES dbo.LoaiPhanAnh(MaLoai),
    CONSTRAINT FK_KiemTraTrung_NguoiDung
        FOREIGN KEY (NguoiKiemTra) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT CK_KiemTraTrung_KetQua
        CHECK (KetQua IN ('KHONG_TRUNG','TUONG_TU','TRUNG')),
    CONSTRAINT CK_KiemTraTrung_MucDo
        CHECK (MucDoTuongTu IS NULL OR MucDoTuongTu BETWEEN 0 AND 100)
);
GO

-- ============================================================
-- 8. PHÂN CÔNG - UC09, UC10
-- Không UNIQUE MaPhanAnh để hỗ trợ phân công lại sau REOPENED.
-- ============================================================
CREATE TABLE dbo.PhanCong
(
    MaPhanCong       VARCHAR(20)    NOT NULL,
    MaPhanAnh        VARCHAR(20)    NOT NULL,
    MaDonVi          VARCHAR(20)    NOT NULL,
    MaNguoiPhanCong  VARCHAR(20)    NOT NULL,
    MaNguoiTiepNhan  VARCHAR(20)    NULL,
    NgayPhanCong     DATETIME2(0) NOT NULL CONSTRAINT DF_PhanCong_NgayPhanCong DEFAULT (SYSDATETIME()),
    HanXuLy          DATETIME2(0)   NULL,
    GhiChu           NVARCHAR(1000) NULL,
    LyDoTraLai       NVARCHAR(1000) NULL,
    TrangThai        VARCHAR(30) NOT NULL CONSTRAINT DF_PhanCong_TrangThai DEFAULT ('ASSIGNED'),

    CONSTRAINT PK_PhanCong PRIMARY KEY (MaPhanCong),
    CONSTRAINT FK_PhanCong_PhanAnh
        FOREIGN KEY (MaPhanAnh) REFERENCES dbo.PhanAnh(MaPhanAnh),
    CONSTRAINT FK_PhanCong_DonVi
        FOREIGN KEY (MaDonVi) REFERENCES dbo.DonViXuLy(MaDonVi),
    CONSTRAINT FK_PhanCong_NguoiPhanCong
        FOREIGN KEY (MaNguoiPhanCong) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT FK_PhanCong_NguoiTiepNhan
        FOREIGN KEY (MaNguoiTiepNhan) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT CK_PhanCong_TrangThai CHECK
        (TrangThai IN ('ASSIGNED','ACCEPTED','RETURN_REQUESTED','DONE','CANCELLED')),
    CONSTRAINT CK_PhanCong_HanXuLy CHECK
        (HanXuLy IS NULL OR HanXuLy >= NgayPhanCong)
);
GO

CREATE INDEX IX_PhanCong_PhanAnh ON dbo.PhanCong(MaPhanAnh, NgayPhanCong DESC);
CREATE INDEX IX_PhanCong_DonVi_TrangThai ON dbo.PhanCong(MaDonVi, TrangThai, NgayPhanCong DESC);
GO

-- ============================================================
-- 9. TIẾN ĐỘ XỬ LÝ - UC11
-- ============================================================
CREATE TABLE dbo.TienDoXuLy
(
    MaTienDo        VARCHAR(20)    NOT NULL,
    MaPhanAnh       VARCHAR(20)    NOT NULL,
    MaPhanCong      VARCHAR(20)    NULL,
    MaNguoiCapNhat  VARCHAR(20)    NOT NULL,
    NoiDung         NVARCHAR(2000) NOT NULL,
    NgayCapNhat     DATETIME2(0) NOT NULL CONSTRAINT DF_TienDoXuLy_NgayCapNhat DEFAULT (SYSDATETIME()),
    TrangThai       VARCHAR(30) NOT NULL CONSTRAINT DF_TienDoXuLy_TrangThai DEFAULT ('IN_PROGRESS'),
    HinhAnh         NVARCHAR(500)  NULL,

    CONSTRAINT PK_TienDoXuLy PRIMARY KEY (MaTienDo),
    CONSTRAINT FK_TienDoXuLy_PhanAnh
        FOREIGN KEY (MaPhanAnh) REFERENCES dbo.PhanAnh(MaPhanAnh),
    CONSTRAINT FK_TienDoXuLy_PhanCong
        FOREIGN KEY (MaPhanCong) REFERENCES dbo.PhanCong(MaPhanCong),
    CONSTRAINT FK_TienDoXuLy_NguoiDung
        FOREIGN KEY (MaNguoiCapNhat) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT CK_TienDoXuLy_TrangThai CHECK (TrangThai = 'IN_PROGRESS')
);
GO

CREATE INDEX IX_TienDoXuLy_PhanAnh ON dbo.TienDoXuLy(MaPhanAnh, NgayCapNhat DESC);
GO

-- ============================================================
-- 10. KẾT QUẢ XỬ LÝ - UC12
-- KHÔNG UNIQUE MaPhanAnh: một PA có thể gửi lại kết quả sau khi
-- nghiệm thu KHÔNG ĐẠT.
-- ============================================================
CREATE TABLE dbo.KetQuaXuLy
(
    MaKetQua       VARCHAR(20)    NOT NULL,
    MaPhanAnh      VARCHAR(20)    NOT NULL,
    MaNguoiGui     VARCHAR(20)    NOT NULL,
    MoTaKetQua     NVARCHAR(2000) NOT NULL,
    NgayHoanThanh  DATETIME2(0) NOT NULL CONSTRAINT DF_KetQuaXuLy_NgayHoanThanh DEFAULT (SYSDATETIME()),
    HinhAnh        NVARCHAR(500)  NULL,
    TrangThai      VARCHAR(30) NOT NULL CONSTRAINT DF_KetQuaXuLy_TrangThai DEFAULT ('WAITING_ACCEPTANCE'),

    CONSTRAINT PK_KetQuaXuLy PRIMARY KEY (MaKetQua),
    CONSTRAINT FK_KetQuaXuLy_PhanAnh
        FOREIGN KEY (MaPhanAnh) REFERENCES dbo.PhanAnh(MaPhanAnh),
    CONSTRAINT FK_KetQuaXuLy_NguoiDung
        FOREIGN KEY (MaNguoiGui) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT CK_KetQuaXuLy_TrangThai CHECK
        (TrangThai IN ('WAITING_ACCEPTANCE','ACCEPTED','REJECTED'))
);
GO

CREATE INDEX IX_KetQuaXuLy_PhanAnh ON dbo.KetQuaXuLy(MaPhanAnh, NgayHoanThanh DESC);
CREATE INDEX IX_KetQuaXuLy_TrangThai ON dbo.KetQuaXuLy(TrangThai, NgayHoanThanh DESC);
GO

-- ============================================================
-- 11. NGHIỆM THU - UC13
-- Mỗi lần gửi kết quả (MaKetQua) chỉ nghiệm thu 1 lần.
-- Nếu không đạt, đơn vị tạo MaKetQua mới cho lần gửi sau.
-- ============================================================
CREATE TABLE dbo.NghiemThu
(
    MaNghiemThu       VARCHAR(20)    NOT NULL,
    MaKetQua          VARCHAR(20)    NOT NULL,
    MaCanBoNghiemThu  VARCHAR(20)    NOT NULL,
    NgayNghiemThu     DATETIME2(0) NOT NULL CONSTRAINT DF_NghiemThu_NgayNghiemThu DEFAULT (SYSDATETIME()),
    KetQua            VARCHAR(20)    NOT NULL,
    GhiChu            NVARCHAR(1000) NULL,
    TrangThai         VARCHAR(30)    NOT NULL,

    CONSTRAINT PK_NghiemThu PRIMARY KEY (MaNghiemThu),
    CONSTRAINT UQ_NghiemThu_MaKetQua UNIQUE (MaKetQua),
    CONSTRAINT FK_NghiemThu_KetQuaXuLy
        FOREIGN KEY (MaKetQua) REFERENCES dbo.KetQuaXuLy(MaKetQua),
    CONSTRAINT FK_NghiemThu_NguoiDung
        FOREIGN KEY (MaCanBoNghiemThu) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT CK_NghiemThu_KetQua CHECK (KetQua IN ('DAT','KHONG_DAT')),
    CONSTRAINT CK_NghiemThu_TrangThai CHECK
        (TrangThai IN ('ACCEPTED','REWORK_REQUIRED'))
);
GO

-- ============================================================
-- 12. PHẢN HỒI - UC06
-- ============================================================
CREATE TABLE dbo.PhanHoi
(
    MaPhanHoi     VARCHAR(20)    NOT NULL,
    MaPhanAnh     VARCHAR(20)    NOT NULL,
    MaNguoiDung   VARCHAR(20)    NOT NULL,
    NoiDung       NVARCHAR(1000) NULL,
    MucDoHaiLong  TINYINT        NOT NULL,
    NgayPhanHoi   DATETIME2(0) NOT NULL CONSTRAINT DF_PhanHoi_NgayPhanHoi DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_PhanHoi PRIMARY KEY (MaPhanHoi),
    CONSTRAINT FK_PhanHoi_PhanAnh
        FOREIGN KEY (MaPhanAnh) REFERENCES dbo.PhanAnh(MaPhanAnh),
    CONSTRAINT FK_PhanHoi_NguoiDung
        FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT CK_PhanHoi_MucDoHaiLong CHECK (MucDoHaiLong BETWEEN 1 AND 5)
);
GO

CREATE INDEX IX_PhanHoi_PhanAnh ON dbo.PhanHoi(MaPhanAnh, NgayPhanHoi DESC);
GO

-- ============================================================
-- 13. YÊU CẦU XEM XÉT LẠI - UC07, UC14
-- ============================================================
CREATE TABLE dbo.YeuCauXemXetLai
(
    MaYeuCau     VARCHAR(20)    NOT NULL,
    MaPhanAnh    VARCHAR(20)    NOT NULL,
    MaNguoiDung  VARCHAR(20)    NOT NULL,
    MaNguoiXuLy  VARCHAR(20)    NULL,
    LyDo         NVARCHAR(1000) NOT NULL,
    NoiDung      NVARCHAR(2000) NULL,
    NgayYeuCau   DATETIME2(0) NOT NULL CONSTRAINT DF_YeuCauXemXetLai_NgayYeuCau DEFAULT (SYSDATETIME()),
    TrangThai    VARCHAR(20) NOT NULL CONSTRAINT DF_YeuCauXemXetLai_TrangThai DEFAULT ('PENDING'),
    LyDoTuChoi   NVARCHAR(1000) NULL,
    GhiChuXuLy   NVARCHAR(1000) NULL,

    CONSTRAINT PK_YeuCauXemXetLai PRIMARY KEY (MaYeuCau),
    CONSTRAINT FK_YeuCauXemXetLai_PhanAnh
        FOREIGN KEY (MaPhanAnh) REFERENCES dbo.PhanAnh(MaPhanAnh),
    CONSTRAINT FK_YeuCauXemXetLai_NguoiDan
        FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT FK_YeuCauXemXetLai_NguoiXuLy
        FOREIGN KEY (MaNguoiXuLy) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT CK_YeuCauXemXetLai_TrangThai CHECK
        (TrangThai IN ('PENDING','APPROVED','REJECTED'))
);
GO

CREATE UNIQUE INDEX UX_YeuCauXemXetLai_Pending
ON dbo.YeuCauXemXetLai(MaPhanAnh)
WHERE TrangThai = 'PENDING';
GO

-- ============================================================
-- 14. THÔNG BÁO
-- ============================================================
CREATE TABLE dbo.ThongBao
(
    MaThongBao    VARCHAR(20)    NOT NULL,
    MaNguoiDung   VARCHAR(20)    NOT NULL,
    MaPhanAnh     VARCHAR(20)    NULL,
    TieuDe        NVARCHAR(200)  NOT NULL,
    NoiDung       NVARCHAR(1000) NOT NULL,
    LoaiThongBao  VARCHAR(50)    NOT NULL,
    ThoiGian      DATETIME2(0) NOT NULL CONSTRAINT DF_ThongBao_ThoiGian DEFAULT (SYSDATETIME()),
    DaDoc         BIT NOT NULL CONSTRAINT DF_ThongBao_DaDoc DEFAULT (0),

    CONSTRAINT PK_ThongBao PRIMARY KEY (MaThongBao),
    CONSTRAINT FK_ThongBao_NguoiDung
        FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT FK_ThongBao_PhanAnh
        FOREIGN KEY (MaPhanAnh) REFERENCES dbo.PhanAnh(MaPhanAnh)
);
GO

CREATE INDEX IX_ThongBao_NguoiDung
ON dbo.ThongBao(MaNguoiDung, DaDoc, ThoiGian DESC);
GO

-- ============================================================
-- 15. LỊCH SỬ TRẠNG THÁI - UC05 + truy vết toàn hệ thống
-- ============================================================
CREATE TABLE dbo.LichSuTrangThai
(
    MaLichSu         VARCHAR(20)    NOT NULL,
    MaPhanAnh        VARCHAR(20)    NOT NULL,
    MaNguoiThucHien  VARCHAR(20)    NULL,
    TrangThaiCu      VARCHAR(30)    NULL,
    TrangThaiMoi     VARCHAR(30)    NOT NULL,
    ThoiGian         DATETIME2(0) NOT NULL CONSTRAINT DF_LichSuTrangThai_ThoiGian DEFAULT (SYSDATETIME()),
    GhiChu           NVARCHAR(1000) NULL,

    CONSTRAINT PK_LichSuTrangThai PRIMARY KEY (MaLichSu),
    CONSTRAINT FK_LichSuTrangThai_PhanAnh
        FOREIGN KEY (MaPhanAnh) REFERENCES dbo.PhanAnh(MaPhanAnh),
    CONSTRAINT FK_LichSuTrangThai_NguoiDung
        FOREIGN KEY (MaNguoiThucHien) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT CK_LichSuTrangThai_Cu CHECK
    (
        TrangThaiCu IS NULL OR TrangThaiCu IN
        ('SUBMITTED','VERIFIED','REJECTED','ASSIGNED','IN_PROGRESS',
         'WAITING_ACCEPTANCE','CLOSED','REOPENED')
    ),
    CONSTRAINT CK_LichSuTrangThai_Moi CHECK
    (
        TrangThaiMoi IN
        ('SUBMITTED','VERIFIED','REJECTED','ASSIGNED','IN_PROGRESS',
         'WAITING_ACCEPTANCE','CLOSED','REOPENED')
    )
);
GO

CREATE INDEX IX_LichSuTrangThai_PhanAnh
ON dbo.LichSuTrangThai(MaPhanAnh, ThoiGian DESC);
GO

-- ============================================================
-- 16. DỮ LIỆU DANH MỤC BAN ĐẦU
-- ============================================================
INSERT dbo.VaiTro(MaVaiTro, TenVaiTro, MoTa) VALUES
('VT01', N'Người dân', N'Người gửi và theo dõi phản ánh'),
('VT02', N'Cán bộ tiếp nhận', N'Tiếp nhận, phân loại và phân công phản ánh'),
('VT03', N'Đơn vị xử lý', N'Tiếp nhận nhiệm vụ và xử lý phản ánh'),
('VT04', N'Cán bộ nghiệm thu', N'Nghiệm thu kết quả xử lý'),
('VT05', N'Quản trị viên', N'Quản lý danh mục và xem báo cáo');
GO

INSERT dbo.DonViXuLy
(MaDonVi, TenDonVi, LoaiDonVi, DiaChi, SoDienThoai, Email, TrangThai)
VALUES
('DV01', N'Đơn vị xử lý giao thông', N'Giao thông', N'TP.HCM', NULL, 'giaothong@example.com', 1),
('DV02', N'Đơn vị xử lý chiếu sáng', N'Chiếu sáng', N'TP.HCM', NULL, 'chieusang@example.com', 1),
('DV03', N'Đơn vị môi trường đô thị', N'Môi trường', N'TP.HCM', NULL, 'moitruong@example.com', 1);
GO

INSERT dbo.LoaiPhanAnh(MaLoai, TenLoai, MoTa, TrangThai) VALUES
('LPA01', N'Giao thông', N'Đường, cầu, biển báo, mặt đường và hạ tầng giao thông', 1),
('LPA02', N'Chiếu sáng', N'Đèn đường và hệ thống chiếu sáng công cộng', 1),
('LPA03', N'Môi trường', N'Rác thải, vệ sinh môi trường và cảnh quan đô thị', 1),
('LPA04', N'Cấp thoát nước', N'Ngập nước, cống và hệ thống thoát nước', 1),
('LPA05', N'Khác', N'Các phản ánh hạ tầng đô thị khác', 1);
GO

-- ============================================================
-- 17. VIEW UC05 - THEO DÕI PHẢN ÁNH
-- Lấy đơn vị của lần phân công mới nhất.
-- ============================================================
CREATE OR ALTER VIEW dbo.vw_PhanAnhTheoDoi
AS
SELECT
    pa.MaPhanAnh,
    pa.MaNguoiDung,
    pa.MaLoai,
    lpa.TenLoai,
    pa.TieuDe,
    pa.NoiDung,
    pa.ViTri,
    pa.ToaDo,
    pa.NgayGui,
    pa.TrangThai,
    pa.MucDoUuTien,
    pc.MaDonVi,
    dv.TenDonVi,
    pc.NgayPhanCong,
    pc.HanXuLy,
    pc.TrangThai AS TrangThaiPhanCong
FROM dbo.PhanAnh pa
INNER JOIN dbo.LoaiPhanAnh lpa ON lpa.MaLoai = pa.MaLoai
OUTER APPLY
(
    SELECT TOP (1)
        p.MaDonVi, p.NgayPhanCong, p.HanXuLy, p.TrangThai
    FROM dbo.PhanCong p
    WHERE p.MaPhanAnh = pa.MaPhanAnh
    ORDER BY p.NgayPhanCong DESC
) pc
LEFT JOIN dbo.DonViXuLy dv ON dv.MaDonVi = pc.MaDonVi;
GO

-- ============================================================
-- 18. VIEW UC13 - CHỜ NGHIỆM THU
-- ============================================================
CREATE OR ALTER VIEW dbo.vw_KetQuaChoNghiemThu
AS
SELECT
    kq.MaKetQua,
    kq.MaPhanAnh,
    pa.TieuDe,
    pa.ViTri,
    kq.MaNguoiGui,
    kq.MoTaKetQua,
    kq.NgayHoanThanh,
    kq.HinhAnh,
    kq.TrangThai
FROM dbo.KetQuaXuLy kq
INNER JOIN dbo.PhanAnh pa ON pa.MaPhanAnh = kq.MaPhanAnh
WHERE kq.TrangThai = 'WAITING_ACCEPTANCE'
  AND pa.TrangThai = 'WAITING_ACCEPTANCE';
GO

-- ============================================================
-- 19. VIEW UC16 - BÁO CÁO
-- ============================================================
CREATE OR ALTER VIEW dbo.vw_BaoCaoPhanAnh
AS
SELECT
    pa.MaPhanAnh,
    pa.NgayGui,
    pa.TrangThai,
    pa.MucDoUuTien,
    pa.MaLoai,
    lpa.TenLoai,
    pa.ViTri,
    pc.MaDonVi,
    dv.TenDonVi
FROM dbo.PhanAnh pa
INNER JOIN dbo.LoaiPhanAnh lpa ON lpa.MaLoai = pa.MaLoai
OUTER APPLY
(
    SELECT TOP (1) p.MaDonVi
    FROM dbo.PhanCong p
    WHERE p.MaPhanAnh = pa.MaPhanAnh
    ORDER BY p.NgayPhanCong DESC
) pc
LEFT JOIN dbo.DonViXuLy dv ON dv.MaDonVi = pc.MaDonVi;
GO

-- ============================================================
-- 20. QUERY KIỂM TRA NGHIỆP VỤ
-- ============================================================

-- A. Tài khoản VT03 phải có MaDonVi
SELECT MaNguoiDung, HoTen, Email, MaVaiTro, MaDonVi, TrangThai
FROM dbo.NguoiDung
ORDER BY MaVaiTro, MaDonVi;

-- B. Theo dõi chuỗi trạng thái phản ánh
SELECT MaPhanAnh, TieuDe, TrangThai, NgayGui
FROM dbo.PhanAnh
ORDER BY NgayGui DESC;

-- C. Phân công / tiếp nhận nhiệm vụ
SELECT
    pc.MaPhanCong,
    pc.MaPhanAnh,
    pc.MaDonVi,
    pc.MaNguoiTiepNhan,
    pc.TrangThai AS TrangThaiPhanCong,
    pa.TrangThai AS TrangThaiPhanAnh,
    pc.NgayPhanCong,
    pc.HanXuLy
FROM dbo.PhanCong pc
INNER JOIN dbo.PhanAnh pa ON pa.MaPhanAnh = pc.MaPhanAnh
ORDER BY pc.NgayPhanCong DESC;

-- D. Kết quả và nghiệm thu
SELECT
    pa.MaPhanAnh,
    pa.TrangThai AS TrangThaiPhanAnh,
    kq.MaKetQua,
    kq.TrangThai AS TrangThaiKetQua,
    nt.KetQua AS KetQuaNghiemThu,
    nt.TrangThai AS TrangThaiNghiemThu
FROM dbo.PhanAnh pa
LEFT JOIN dbo.KetQuaXuLy kq ON kq.MaPhanAnh = pa.MaPhanAnh
LEFT JOIN dbo.NghiemThu nt ON nt.MaKetQua = kq.MaKetQua
ORDER BY pa.NgayGui DESC, kq.NgayHoanThanh DESC;

-- E. Lịch sử trạng thái
SELECT *
FROM dbo.LichSuTrangThai
ORDER BY ThoiGian DESC;
GO

PRINT N'Đã tạo CSDL chuẩn QuanLyPhanAnhHaTangDoThi.';
GO
