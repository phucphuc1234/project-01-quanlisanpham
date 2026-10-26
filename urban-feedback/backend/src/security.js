import jwt from 'jsonwebtoken';
import { query } from './db.js';
import { HttpError, asyncRoute } from './lib.js';

export const userSelect = `SELECT nd.MaNguoiDung AS id, nd.HoTen AS name, nd.Email AS email, nd.SoDienThoai AS phone,
 nd.DiaChi AS address, nd.MaVaiTro AS role, vt.TenVaiTro AS roleName, nd.MaDonVi AS unitId,
 dv.TenDonVi AS unitName, nd.TrangThai AS active, vt.TrangThai AS roleActive, dv.TrangThai AS unitActive, nd.MatKhau AS passwordHash
 FROM dbo.NguoiDung nd JOIN dbo.VaiTro vt ON vt.MaVaiTro=nd.MaVaiTro
 LEFT JOIN dbo.DonViXuLy dv ON dv.MaDonVi=nd.MaDonVi`;
export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, MatKhau, roleActive, unitActive, ...clean } = user;
  return clean;
}
const cookieName = 'urban_session';
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 8 * 3600 * 1000 });
function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET phải có tối thiểu 32 ký tự.');
  return process.env.JWT_SECRET;
}
export function signToken(user) { return jwt.sign({}, secret(), { subject: user.id, expiresIn: '8h', issuer: 'urban-feedback', audience: 'urban-feedback-web' }); }
export function setAuthCookie(res, user) { res.cookie(cookieName, signToken(user), cookieOptions()); }
export function clearAuthCookie(res) { const { maxAge, ...options } = cookieOptions(); res.clearCookie(cookieName, options); }
export const authenticate = asyncRoute(async (req, res, next) => {
  const token = req.cookies?.[cookieName] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (!token) return next();
  let payload;
  try { payload = jwt.verify(token, secret(), { issuer: 'urban-feedback', audience: 'urban-feedback-web', algorithms: ['HS256'] }); }
  catch { clearAuthCookie(res); return next(); }
  const user = (await query(`${userSelect} WHERE nd.MaNguoiDung=@id`, { id: payload.sub })).recordset[0];
  if (user?.active && user.roleActive && (user.role !== 'VT03' || user.unitActive)) req.user = publicUser(user);
  else clearAuthCookie(res);
  next();
});
export function mutationOrigin(allowedOrigins) {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.headers.origin;
    const fetchSite = req.headers['sec-fetch-site'];
    if (origin && !allowedOrigins.includes(origin)) return next(new HttpError(403, 'Nguồn yêu cầu không được phép.'));
    if (!origin && fetchSite === 'cross-site') return next(new HttpError(403, 'Yêu cầu khác nguồn không hợp lệ.'));
    next();
  };
}
