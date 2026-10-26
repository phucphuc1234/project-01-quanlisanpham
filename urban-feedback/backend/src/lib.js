import { randomBytes } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
export const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const id = prefix => `${prefix}${Date.now().toString(36).padStart(9, '0')}${randomBytes(4).toString('hex')}`;
export function text(value, label, { min = 0, max = 1000, required = false } = {}) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') throw new HttpError(400, `${label} không hợp lệ.`);
  const result = value.trim();
  if ((required && !result) || result.length < min || result.length > max) throw new HttpError(400, `${label} phải có từ ${Math.max(min, required ? 1 : 0)} đến ${max} ký tự.`);
  return result;
}
export function requireAuth(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Vui lòng đăng nhập để tiếp tục.'));
  next();
}
export const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) return next(new HttpError(401, 'Vui lòng đăng nhập để tiếp tục.'));
  if (!roles.flat().includes(req.user.role)) return next(new HttpError(403, 'Bạn không có quyền thực hiện thao tác này.'));
  next();
};
export function pagination(query = {}) {
  const page = Math.max(1, Math.min(100000, Number.parseInt(query.page, 10) || 1));
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(query.pageSize, 10) || 12));
  return { page, pageSize, offset: (page - 1) * pageSize };
}
export const statuses = ['SUBMITTED', 'VERIFIED', 'REJECTED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_ACCEPTANCE', 'CLOSED', 'REOPENED'];
export const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
export function location(input) {
  if (input.latitude === '' || input.longitude === '' || input.latitude == null || input.longitude == null) throw new HttpError(400, 'Vui lòng chọn vị trí trên bản đồ.');
  if (![input.latitude, input.longitude].every(value => ['number', 'string'].includes(typeof value))) throw new HttpError(400, 'Tọa độ vị trí không hợp lệ.');
  const latitude = Number(input.latitude), longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new HttpError(400, 'Tọa độ vị trí không hợp lệ.');
  return { latitude, longitude };
}
export function distanceMeters(a, b) {
  const radians = degrees => degrees * Math.PI / 180;
  const p = Math.sin(radians(b.latitude - a.latitude) / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(p), Math.sqrt(Math.max(0, 1 - p)));
}
export function coarseAddress(address = '') {
  const pieces = address.split(',').map(v => v.trim()).filter(Boolean);
  return pieces.length > 1 ? pieces.slice(-2).join(', ') : 'Khu vực đô thị';
}
