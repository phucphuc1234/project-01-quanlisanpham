import { Router } from 'express';
import { query } from '../db.js';
import { asyncRoute } from '../lib.js';

const router = Router();
router.get('/', asyncRoute(async (req, res) => {
  const showInactive = req.user?.role === 'VT05';
  const [categories, units, roles] = await Promise.all([
    query(`SELECT MaLoai AS id, TenLoai AS name, MoTa AS description, TrangThai AS active
      FROM dbo.LoaiPhanAnh ${showInactive ? '' : 'WHERE TrangThai=1'} ORDER BY MaLoai`),
    query(`SELECT MaDonVi AS id, TenDonVi AS name, LoaiDonVi AS type, DiaChi AS address,
      SoDienThoai AS phone, Email AS email, TrangThai AS active
      FROM dbo.DonViXuLy ${showInactive ? '' : 'WHERE TrangThai=1'} ORDER BY MaDonVi`),
    query('SELECT MaVaiTro AS id, TenVaiTro AS name FROM dbo.VaiTro WHERE TrangThai=1 ORDER BY MaVaiTro')
  ]);
  res.json({ categories: categories.recordset, units: units.recordset, roles: roles.recordset });
}));

export default router;
