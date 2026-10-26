import { Router } from 'express';
import { query, transaction } from '../db.js';
import { HttpError, asyncRoute, id, text, requireRoles, pagination } from '../lib.js';

const router = Router();
router.use(requireRoles('VT05'));

function activeValue(value, fallback = true) {
  if (value === undefined) return Boolean(fallback);
  if (typeof value !== 'boolean') throw new HttpError(400, 'Trạng thái hoạt động phải là true hoặc false.');
  return value;
}

function optionalEmail(value) {
  const email = text(value, 'Email', { max: 150 }).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Email không hợp lệ.');
  return email || null;
}

function optionalPhone(value) {
  const phone = text(value, 'Số điện thoại', { max: 20 }).replace(/[\s().-]/g, '');
  if (phone && !/^\+?\d{9,15}$/.test(phone)) throw new HttpError(400, 'Số điện thoại không hợp lệ.');
  return phone || null;
}

async function uniqueWrite(write, message) {
  try {
    return await write();
  } catch (error) {
    if ([2601, 2627].includes(error.number)) throw new HttpError(409, message);
    throw error;
  }
}

const categorySelect = 'SELECT MaLoai AS id, TenLoai AS name, MoTa AS description, TrangThai AS active FROM dbo.LoaiPhanAnh';
const unitSelect = `SELECT MaDonVi AS id, TenDonVi AS name, LoaiDonVi AS type, DiaChi AS address,
  SoDienThoai AS phone, Email AS email, TrangThai AS active FROM dbo.DonViXuLy`;
const userSelect = `SELECT nd.MaNguoiDung AS id, nd.HoTen AS name, nd.Email AS email,
  nd.SoDienThoai AS phone, nd.DiaChi AS address, nd.MaVaiTro AS role, vt.TenVaiTro AS roleName,
  nd.MaDonVi AS unitId, dv.TenDonVi AS unitName, nd.TrangThai AS active
  FROM dbo.NguoiDung nd INNER JOIN dbo.VaiTro vt ON vt.MaVaiTro=nd.MaVaiTro
  LEFT JOIN dbo.DonViXuLy dv ON dv.MaDonVi=nd.MaDonVi`;

router.get('/categories', asyncRoute(async (_req, res) => {
  const result = await query(`${categorySelect} ORDER BY MaLoai`);
  res.json({ items: result.recordset, total: result.recordset.length, page: 1, pageSize: result.recordset.length });
}));

router.post('/categories', asyncRoute(async (req, res) => {
  const categoryId = id('LPA');
  const name = text(req.body.name, 'Tên loại phản ánh', { required: true, min: 2, max: 150 });
  const description = text(req.body.description, 'Mô tả', { max: 500 }) || null;
  const active = activeValue(req.body.active);
  await uniqueWrite(() => query(`INSERT dbo.LoaiPhanAnh (MaLoai,TenLoai,MoTa,TrangThai)
    VALUES (@categoryId,@name,@description,@active)`, { categoryId, name, description, active }), 'Tên loại phản ánh đã tồn tại.');
  const result = await query(`${categorySelect} WHERE MaLoai=@categoryId`, { categoryId });
  res.status(201).json({ item: result.recordset[0] });
}));

router.patch('/categories/:id', asyncRoute(async (req, res) => {
  const categoryId = text(req.params.id, 'Mã loại phản ánh', { required: true, max: 20 });
  const item = await transaction(async tx => {
    const existing = (await query('SELECT * FROM dbo.LoaiPhanAnh WITH (UPDLOCK,HOLDLOCK) WHERE MaLoai=@categoryId', { categoryId }, tx)).recordset[0];
    if (!existing) throw new HttpError(404, 'Không tìm thấy loại phản ánh.');
    const name = req.body.name === undefined ? existing.TenLoai : text(req.body.name, 'Tên loại phản ánh', { required: true, min: 2, max: 150 });
    const description = req.body.description === undefined ? existing.MoTa : text(req.body.description, 'Mô tả', { max: 500 }) || null;
    const active = activeValue(req.body.active, existing.TrangThai);
    await uniqueWrite(() => query('UPDATE dbo.LoaiPhanAnh SET TenLoai=@name,MoTa=@description,TrangThai=@active WHERE MaLoai=@categoryId', { categoryId, name, description, active }, tx), 'Tên loại phản ánh đã tồn tại.');
    return (await query(`${categorySelect} WHERE MaLoai=@categoryId`, { categoryId }, tx)).recordset[0];
  });
  res.json({ item });
}));

router.get('/units', asyncRoute(async (_req, res) => {
  const result = await query(`${unitSelect} ORDER BY MaDonVi`);
  res.json({ items: result.recordset, total: result.recordset.length, page: 1, pageSize: result.recordset.length });
}));

router.post('/units', asyncRoute(async (req, res) => {
  const unitId = id('DV');
  const name = text(req.body.name, 'Tên đơn vị', { required: true, min: 2, max: 150 });
  const type = text(req.body.type, 'Lĩnh vực', { max: 100 }) || null;
  const address = text(req.body.address, 'Địa chỉ', { max: 255 }) || null;
  const phone = optionalPhone(req.body.phone);
  const email = optionalEmail(req.body.email);
  const active = activeValue(req.body.active);
  await uniqueWrite(() => query(`INSERT dbo.DonViXuLy (MaDonVi,TenDonVi,LoaiDonVi,DiaChi,SoDienThoai,Email,TrangThai)
    VALUES (@unitId,@name,@type,@address,@phone,@email,@active)`, { unitId, name, type, address, phone, email, active }), 'Tên đơn vị, email hoặc số điện thoại đã tồn tại.');
  res.status(201).json({ item: (await query(`${unitSelect} WHERE MaDonVi=@unitId`, { unitId })).recordset[0] });
}));

router.patch('/units/:id', asyncRoute(async (req, res) => {
  const unitId = text(req.params.id, 'Mã đơn vị', { required: true, max: 20 });
  const item = await transaction(async tx => {
    const existing = (await query('SELECT * FROM dbo.DonViXuLy WITH (UPDLOCK,HOLDLOCK) WHERE MaDonVi=@unitId', { unitId }, tx)).recordset[0];
    if (!existing) throw new HttpError(404, 'Không tìm thấy đơn vị.');
    const name = req.body.name === undefined ? existing.TenDonVi : text(req.body.name, 'Tên đơn vị', { required: true, min: 2, max: 150 });
    const type = req.body.type === undefined ? existing.LoaiDonVi : text(req.body.type, 'Lĩnh vực', { max: 100 }) || null;
    const address = req.body.address === undefined ? existing.DiaChi : text(req.body.address, 'Địa chỉ', { max: 255 }) || null;
    const phone = req.body.phone === undefined ? existing.SoDienThoai : optionalPhone(req.body.phone);
    const email = req.body.email === undefined ? existing.Email : optionalEmail(req.body.email);
    const active = activeValue(req.body.active, existing.TrangThai);
    if (!active && existing.TrangThai) {
      const openTasks = await query(`SELECT TOP (1) MaPhanCong FROM dbo.PhanCong
        WHERE MaDonVi=@unitId AND TrangThai IN ('ASSIGNED','ACCEPTED')`, { unitId }, tx);
      if (openTasks.recordset.length) throw new HttpError(409, 'Đơn vị còn nhiệm vụ chưa hoàn thành. Hãy xử lý hoặc chuyển nhiệm vụ trước khi ngừng hoạt động.');
    }
    await uniqueWrite(() => query(`UPDATE dbo.DonViXuLy SET TenDonVi=@name,LoaiDonVi=@type,
      DiaChi=@address,SoDienThoai=@phone,Email=@email,TrangThai=@active WHERE MaDonVi=@unitId`, { unitId, name, type, address, phone, email, active }, tx), 'Tên đơn vị, email hoặc số điện thoại đã tồn tại.');
    return (await query(`${unitSelect} WHERE MaDonVi=@unitId`, { unitId }, tx)).recordset[0];
  });
  res.json({ item });
}));

router.get('/users', asyncRoute(async (req, res) => {
  const { page, pageSize, offset } = pagination({ ...req.query, pageSize: req.query.pageSize || 50 });
  const search = text(req.query.search, 'Tìm kiếm', { max: 150 });
  const role = text(req.query.role, 'Vai trò', { max: 10 });
  const clauses = [];
  const params = { offset, pageSize };
  if (search) { clauses.push('(nd.HoTen LIKE @search OR nd.Email LIKE @search OR nd.SoDienThoai LIKE @search)'); params.search = `%${search}%`; }
  if (role) { clauses.push('nd.MaVaiTro=@role'); params.role = role; }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const result = await query(`${userSelect}${where} ORDER BY nd.NgayTao DESC,nd.MaNguoiDung
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    SELECT COUNT(*) AS total FROM dbo.NguoiDung nd${where}`, params);
  res.json({ items: result.recordset, total: result.recordsets[1][0].total, page, pageSize });
}));

router.patch('/users/:id', asyncRoute(async (req, res) => {
  const userId = text(req.params.id, 'Mã người dùng', { required: true, max: 20 });
  const user = await transaction(async tx => {
    // Lock the same administrator set first for every edit: concurrent demotions
    // cannot both observe another active administrator and remove all access.
    const admins = await query(`SELECT MaNguoiDung FROM dbo.NguoiDung WITH (UPDLOCK,HOLDLOCK)
      WHERE MaVaiTro='VT05' AND TrangThai=1`, {}, tx);
    const existing = (await query('SELECT * FROM dbo.NguoiDung WITH (UPDLOCK,HOLDLOCK) WHERE MaNguoiDung=@userId', { userId }, tx)).recordset[0];
    if (!existing) throw new HttpError(404, 'Không tìm thấy người dùng.');
    const role = req.body.role === undefined ? existing.MaVaiTro : text(req.body.role, 'Vai trò', { required: true, max: 10 });
    if (!['VT01', 'VT02', 'VT03', 'VT04', 'VT05'].includes(role)) throw new HttpError(400, 'Vai trò không hợp lệ.');
    const roleRow = (await query('SELECT TrangThai FROM dbo.VaiTro WHERE MaVaiTro=@role', { role }, tx)).recordset[0];
    if (!roleRow?.TrangThai) throw new HttpError(400, 'Vai trò đã ngừng hoạt động.');
    const active = activeValue(req.body.active, existing.TrangThai);
    const unitId = role === 'VT03'
      ? (req.body.unitId === undefined ? existing.MaDonVi : text(req.body.unitId, 'Đơn vị xử lý', { required: true, max: 20 }))
      : null;
    if (role === 'VT03') {
      if (!unitId) throw new HttpError(400, 'Tài khoản đơn vị xử lý phải thuộc một đơn vị.');
      const unit = await query('SELECT MaDonVi FROM dbo.DonViXuLy WHERE MaDonVi=@unitId AND TrangThai=1', { unitId }, tx);
      if (!unit.recordset.length) throw new HttpError(400, 'Đơn vị xử lý không tồn tại hoặc đã ngừng hoạt động.');
    }
    if (existing.MaVaiTro === 'VT05' && existing.TrangThai && (role !== 'VT05' || !active) && admins.recordset.length < 2) {
      throw new HttpError(409, 'Không thể khóa hoặc đổi vai trò của quản trị viên đang hoạt động cuối cùng.');
    }
    await query('UPDATE dbo.NguoiDung SET MaVaiTro=@role,MaDonVi=@unitId,TrangThai=@active WHERE MaNguoiDung=@userId', { userId, role, unitId, active }, tx);
    return (await query(`${userSelect} WHERE nd.MaNguoiDung=@userId`, { userId }, tx)).recordset[0];
  });
  res.json({ user });
}));

export default router;
