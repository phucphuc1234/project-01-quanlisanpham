import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { HttpError, asyncRoute, id, text, requireAuth } from '../lib.js';
import { setAuthCookie, clearAuthCookie } from '../security.js';

const router = Router();
const loginFallbackHash = bcrypt.hashSync('not-a-real-account-urban-feedback', 12);
const attempts = new Map();

// Bound memory and limit password hashing work without leaking account existence.
function authLimit(kind, maximum) {
  return (req, res, next) => {
    const now = Date.now();
    if (attempts.size > 1000) for (const [key, item] of attempts) if (item.until < now) attempts.delete(key);
    if (attempts.size > 5000) return res.status(429).json({ message: 'Hệ thống đang bận. Vui lòng thử lại sau.' });
    const key = `${kind}:${req.ip}`;
    const current = attempts.get(key);
    const item = current && current.until > now ? current : { count: 0, until: now + 15 * 60 * 1000 };
    item.count += 1;
    attempts.set(key, item);
    if (item.count > maximum) {
      res.set('Retry-After', String(Math.ceil((item.until - now) / 1000)));
      return res.status(429).json({ message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
    }
    next();
  };
}

function emailValue(value) {
  const email = text(value, 'Email', { required: true, min: 5, max: 150 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Email không hợp lệ.');
  return email;
}

function phoneValue(value) {
  const phone = text(value, 'Số điện thoại', { required: true, min: 9, max: 20 }).replace(/[\s().-]/g, '');
  if (!/^\+?\d{9,15}$/.test(phone)) throw new HttpError(400, 'Số điện thoại phải có từ 9 đến 15 chữ số.');
  return phone;
}

const userSelect = `SELECT nd.MaNguoiDung AS id, nd.HoTen AS name, nd.Email AS email,
  nd.SoDienThoai AS phone, nd.DiaChi AS address, nd.MaVaiTro AS role,
  vt.TenVaiTro AS roleName, nd.MaDonVi AS unitId, dv.TenDonVi AS unitName,
  nd.TrangThai AS active, nd.MatKhau AS passwordHash, vt.TrangThai AS roleActive,
  dv.TrangThai AS unitActive
  FROM dbo.NguoiDung nd INNER JOIN dbo.VaiTro vt ON vt.MaVaiTro = nd.MaVaiTro
  LEFT JOIN dbo.DonViXuLy dv ON dv.MaDonVi = nd.MaDonVi`;

function safeUser(row) {
  const { passwordHash, roleActive, unitActive, ...user } = row;
  return { ...user, active: Boolean(user.active) };
}

router.post('/register', authLimit('register', 10), asyncRoute(async (req, res) => {
  const name = text(req.body.name, 'Họ tên', { required: true, min: 2, max: 120 });
  const email = emailValue(req.body.email);
  const phone = phoneValue(req.body.phone);
  const address = text(req.body.address, 'Địa chỉ', { max: 255 }) || null;
  const password = req.body.password;
  if (typeof password !== 'string' || password.length < 10 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new HttpError(400, 'Mật khẩu phải có ít nhất 10 ký tự và tối đa 72 byte.');
  }
  const duplicate = await query('SELECT TOP (1) MaNguoiDung FROM dbo.NguoiDung WHERE Email=@email OR SoDienThoai=@phone', { email, phone });
  if (duplicate.recordset.length) throw new HttpError(409, 'Email hoặc số điện thoại đã được đăng ký.');
  const userId = id('ND');
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await query(`INSERT dbo.NguoiDung (MaNguoiDung,MaVaiTro,HoTen,Email,SoDienThoai,MatKhau,DiaChi)
      VALUES (@userId,'VT01',@name,@email,@phone,@passwordHash,@address)`, { userId, name, email, phone, passwordHash, address });
  } catch (error) {
    if ([2601, 2627].includes(error.number)) throw new HttpError(409, 'Email hoặc số điện thoại đã được đăng ký.');
    throw error;
  }
  const result = await query(`${userSelect} WHERE nd.MaNguoiDung=@userId`, { userId });
  const user = safeUser(result.recordset[0]);
  setAuthCookie(res, user);
  res.status(201).json({ user });
}));

router.post('/login', authLimit('login', 30), asyncRoute(async (req, res) => {
  const identifier = text(req.body.identifier, 'Email hoặc số điện thoại', { required: true, max: 150 }).toLowerCase();
  const password = req.body.password;
  if (typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
    throw new HttpError(400, 'Vui lòng nhập mật khẩu hợp lệ.');
  }
  const phone = identifier.replace(/[\s().-]/g, '');
  const result = await query(`${userSelect} WHERE nd.Email=@identifier OR nd.SoDienThoai=@phone`, { identifier, phone });
  const row = result.recordset[0];
  const validPassword = await bcrypt.compare(password, row?.passwordHash || loginFallbackHash);
  if (!row || !validPassword) throw new HttpError(401, 'Email/số điện thoại hoặc mật khẩu không đúng.');
  if (!row.active || !row.roleActive || (row.role === 'VT03' && !row.unitActive)) {
    throw new HttpError(403, 'Tài khoản hoặc đơn vị của bạn đã ngừng hoạt động. Vui lòng liên hệ quản trị viên.');
  }
  const user = safeUser(row);
  setAuthCookie(res, user);
  res.json({ user });
}));

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Đã đăng xuất.' });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
