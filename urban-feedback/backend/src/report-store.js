import { query } from './db.js';
import { HttpError, id, pagination, statuses, coarseAddress, distanceMeters } from './lib.js';

export const reportColumns = `pa.MaPhanAnh AS id, pa.MaNguoiDung AS ownerId, pa.TieuDe AS title, pa.NoiDung AS description,
 pa.ViTri AS address, pa.ToaDo AS coordinates, pa.MaLoai AS categoryId, lpa.TenLoai AS categoryName,
 pa.TrangThai AS status, pa.MucDoUuTien AS priority, pa.NgayGui AS createdAt, pa.LyDoTuChoi AS rejectionReason,
 pc.MaPhanCong AS assignmentId, pc.MaDonVi AS unitId, dv.TenDonVi AS unitName, pc.HanXuLy AS dueAt,
 pc.TrangThai AS assignmentStatus,
 (SELECT TOP(1) DuongDan FROM dbo.HinhAnhPhanAnh ha WHERE ha.MaPhanAnh=pa.MaPhanAnh ORDER BY ha.ThoiGianTao,ha.MaHinhAnh) AS incidentThumbnail,
 (SELECT TOP(1) DuongDan FROM dbo.HinhAnhPhanAnh ha WHERE ha.MaPhanAnh=pa.MaPhanAnh AND ha.LoaiAnh='SAU_XU_LY' ORDER BY ha.ThoiGianTao DESC,ha.MaHinhAnh DESC) AS outcomeThumbnail`;
export const reportFrom = `FROM dbo.PhanAnh pa JOIN dbo.LoaiPhanAnh lpa ON lpa.MaLoai=pa.MaLoai
 OUTER APPLY (SELECT TOP(1) p.* FROM dbo.PhanCong p WHERE p.MaPhanAnh=pa.MaPhanAnh ORDER BY p.NgayPhanCong DESC,p.MaPhanCong DESC) pc
 LEFT JOIN dbo.DonViXuLy dv ON dv.MaDonVi=pc.MaDonVi`;
export const isStaff = user => user && ['VT02', 'VT03', 'VT04', 'VT05'].includes(user.role);
export function privateView(row, user) { return Boolean(user && (row.ownerId === user.id || ['VT02', 'VT04', 'VT05'].includes(user.role) || (user.role === 'VT03' && row.unitId === user.unitId))); }
export function allowedReport(row, user) { return privateView(row, user) || row.status === 'CLOSED'; }
export function summary(row, user) {
  const own = privateView(row, user);
  const { coordinates, ownerId, assignmentId, assignmentStatus, incidentThumbnail, outcomeThumbnail, rejectionReason, ...result } = row;
  const [latitude, longitude] = (coordinates || '').split(',').map(Number);
  return { ...result, address: own ? row.address : coarseAddress(row.address),
    latitude: own && Number.isFinite(latitude) ? latitude : null,
    longitude: own && Number.isFinite(longitude) ? longitude : null,
    thumbnail: own ? incidentThumbnail || outcomeThumbnail : outcomeThumbnail,
    ...(own ? { ownerId, rejectionReason, assignmentStatus } : {}) };
}
export async function getRow(reportId, executor) {
  return (await query(`SELECT ${reportColumns} ${reportFrom} WHERE pa.MaPhanAnh=@reportId`, { reportId }, executor)).recordset[0];
}
export async function lockedReport(reportId, tx) {
  const row = (await query(`SELECT MaPhanAnh FROM dbo.PhanAnh WITH(UPDLOCK,HOLDLOCK) WHERE MaPhanAnh=@reportId`, { reportId }, tx)).recordset[0];
  if (!row) throw new HttpError(404, 'Không tìm thấy phản ánh.');
  return getRow(reportId, tx);
}
export async function detail(reportId, user, executor) {
  const row = await getRow(reportId, executor);
  if (!row) throw new HttpError(404, 'Không tìm thấy phản ánh.');
  if (!allowedReport(row, user)) throw new HttpError(403, 'Bạn không có quyền xem phản ánh này.');
  const internal = privateView(row, user);
  const params = { reportId };
  // Sequential reads also work inside one transaction's SQL connection.
  const images = (await query(`SELECT MaHinhAnh AS id,DuongDan AS url,LoaiAnh AS type FROM dbo.HinhAnhPhanAnh WHERE MaPhanAnh=@reportId ORDER BY ThoiGianTao,MaHinhAnh`, params, executor)).recordset;
  const history = (await query(`SELECT ls.MaLichSu AS id,ls.TrangThaiCu AS fromStatus,ls.TrangThaiMoi AS toStatus,ls.GhiChu AS note,ls.ThoiGian AS createdAt,nd.HoTen AS actorName
   FROM dbo.LichSuTrangThai ls LEFT JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=ls.MaNguoiThucHien WHERE ls.MaPhanAnh=@reportId ORDER BY ls.ThoiGian,ls.MaLichSu`, params, executor)).recordset;
  const results = (await query(`SELECT MaKetQua AS id,MoTaKetQua AS note,HinhAnh AS imageUrl,TrangThai AS status,NgayHoanThanh AS createdAt FROM dbo.KetQuaXuLy WHERE MaPhanAnh=@reportId ORDER BY NgayHoanThanh DESC,MaKetQua DESC`, params, executor)).recordset;
  if (!internal) return { ...summary(row, user), images: images.filter(v => v.type === 'SAU_XU_LY'),
    history: history.filter(v => v.fromStatus !== v.toStatus).map(({ note, actorName, ...v }) => v), assignments: [], progress: [], feedback: [], reopens: [],
    results: results.filter(v => v.status === 'ACCEPTED') };
  const assignments = (await query(`SELECT pc.MaPhanCong AS id,pc.MaDonVi AS unitId,dv.TenDonVi AS unitName,pc.HanXuLy AS dueAt,pc.GhiChu AS note,pc.TrangThai AS status,pc.NgayPhanCong AS createdAt,pc.LyDoTraLai AS returnReason FROM dbo.PhanCong pc JOIN dbo.DonViXuLy dv ON dv.MaDonVi=pc.MaDonVi WHERE pc.MaPhanAnh=@reportId ORDER BY pc.NgayPhanCong DESC,pc.MaPhanCong DESC`, params, executor)).recordset;
  const progress = (await query(`SELECT td.MaTienDo AS id,td.NoiDung AS note,td.HinhAnh AS imageUrl,td.NgayCapNhat AS createdAt,nd.HoTen AS actorName FROM dbo.TienDoXuLy td JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=td.MaNguoiCapNhat WHERE td.MaPhanAnh=@reportId ORDER BY td.NgayCapNhat DESC,td.MaTienDo DESC`, params, executor)).recordset;
  const feedback = (await query(`SELECT MaPhanHoi AS id,MucDoHaiLong AS rating,NoiDung AS comment,NgayPhanHoi AS createdAt FROM dbo.PhanHoi WHERE MaPhanAnh=@reportId ORDER BY NgayPhanHoi DESC,MaPhanHoi DESC`, params, executor)).recordset;
  const reopens = (await query(`SELECT MaYeuCau AS id,LyDo AS reason,NoiDung AS description,TrangThai AS status,COALESCE(GhiChuXuLy,LyDoTuChoi) AS note,NgayYeuCau AS createdAt FROM dbo.YeuCauXemXetLai WHERE MaPhanAnh=@reportId ORDER BY NgayYeuCau DESC,MaYeuCau DESC`, params, executor)).recordset;
  return { ...summary(row, user), images, history, assignments, progress, results, feedback, reopens };
}
export function filters(user, input = {}) {
  const clauses = ['1=1'], params = {};
  if (!user) clauses.push("pa.TrangThai='CLOSED'");
  else if (input.mine === 'true') { clauses.push('pa.MaNguoiDung=@viewerId'); params.viewerId = user.id; }
  else if (user.role === 'VT01') { clauses.push("(pa.MaNguoiDung=@viewerId OR pa.TrangThai='CLOSED')"); params.viewerId = user.id; }
  else if (user.role === 'VT03') { clauses.push('pc.MaDonVi=@viewerUnit'); params.viewerUnit = user.unitId; }
  for (const [key, column] of [['categoryId', 'pa.MaLoai'], ['unitId', 'pc.MaDonVi']]) {
    if (input[key]) { clauses.push(`${column}=@${key}`); params[key] = String(input[key]).slice(0, 30); }
  }
  if (input.status) {
    if (!statuses.includes(input.status)) throw new HttpError(400, 'Trạng thái lọc không hợp lệ.');
    clauses.push('pa.TrangThai=@filterStatus'); params.filterStatus = input.status;
  }
  if (input.search) { clauses.push('(pa.TieuDe LIKE @search OR pa.MaPhanAnh LIKE @search OR pa.NoiDung LIKE @search)'); params.search = `%${String(input.search).slice(0, 200)}%`; }
  if (input.area) { clauses.push('pa.ViTri LIKE @area'); params.area = `%${String(input.area).slice(0, 200)}%`; }
  for (const [key, operator] of [['from', '>='], ['to', '<']]) {
    if (!input[key]) continue;
    const date = new Date(String(input[key]));
    if (!Number.isFinite(date.valueOf())) throw new HttpError(400, 'Ngày lọc không hợp lệ.');
    if (key === 'to' && /^\d{4}-\d{2}-\d{2}$/.test(input[key])) date.setUTCDate(date.getUTCDate() + 1);
    clauses.push(`pa.NgayGui${operator}@date${key}`); params[`date${key}`] = date;
  }
  return { where: clauses.join(' AND '), params };
}
export async function listReports(user, input) {
  const { where, params } = filters(user, input);
  const { page, pageSize, offset } = pagination(input);
  const total = (await query(`SELECT COUNT(*) AS total ${reportFrom} WHERE ${where}`, params)).recordset[0].total;
  const rows = (await query(`SELECT ${reportColumns} ${reportFrom} WHERE ${where} ORDER BY pa.NgayGui DESC,pa.MaPhanAnh DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`, { ...params, offset, pageSize })).recordset;
  return { items: rows.map(row => summary(row, user)), total, page, pageSize };
}
export async function addHistory(tx, reportId, actorId, fromStatus, toStatus, note) {
  await query(`INSERT dbo.LichSuTrangThai(MaLichSu,MaPhanAnh,MaNguoiThucHien,TrangThaiCu,TrangThaiMoi,GhiChu,ThoiGian) VALUES(@id,@reportId,@actorId,@fromStatus,@toStatus,@note,SYSUTCDATETIME())`, { id: id('LS'), reportId, actorId, fromStatus, toStatus, note: note || null }, tx);
}
export async function notify(tx, { users = [], roles = [], unitId, reportId, title, message, type = 'WORKFLOW' }) {
  const recipients = new Set(users.filter(Boolean));
  if (roles.length) {
    const params = Object.fromEntries(roles.map((value, index) => [`role${index}`, value]));
    const rows = (await query(`SELECT MaNguoiDung AS id FROM dbo.NguoiDung WHERE TrangThai=1 AND MaVaiTro IN(${roles.map((_, index) => `@role${index}`).join(',')})`, params, tx)).recordset;
    rows.forEach(row => recipients.add(row.id));
  }
  if (unitId) {
    const rows = (await query(`SELECT MaNguoiDung AS id FROM dbo.NguoiDung WHERE TrangThai=1 AND MaVaiTro='VT03' AND MaDonVi=@unitId`, { unitId }, tx)).recordset;
    rows.forEach(row => recipients.add(row.id));
  }
  for (const userId of recipients) await query(`INSERT dbo.ThongBao(MaThongBao,MaNguoiDung,MaPhanAnh,TieuDe,NoiDung,LoaiThongBao,ThoiGian) VALUES(@id,@userId,@reportId,@title,@message,@type,SYSUTCDATETIME())`, { id: id('TB'), userId, reportId, title, message: message.slice(0, 1000), type }, tx);
}
export async function checkCategory(categoryId, executor) {
  if (!(await query('SELECT MaLoai FROM dbo.LoaiPhanAnh WHERE MaLoai=@categoryId AND TrangThai=1', { categoryId }, executor)).recordset.length) throw new HttpError(400, 'Loại phản ánh không tồn tại hoặc đã ngừng hoạt động.');
}
export async function duplicates({ categoryId, latitude, longitude }, user, executor) {
  await checkCategory(categoryId, executor);
  const rows = (await query(`SELECT TOP(1000) ${reportColumns} ${reportFrom} WHERE pa.MaLoai=@categoryId AND pa.NgayGui>=DATEADD(DAY,-30,SYSUTCDATETIME()) AND pa.TrangThai NOT IN('CLOSED','REJECTED') ORDER BY pa.NgayGui DESC`, { categoryId }, executor)).recordset;
  return rows.map(row => {
    const coords = (row.coordinates || '').split(',').map(Number);
    if (coords.length !== 2 || !coords.every(Number.isFinite)) return null;
    const distance = distanceMeters({ latitude, longitude }, { latitude: coords[0], longitude: coords[1] });
    if (distance > 200) return null;
    const item = summary(row, isStaff(user) ? user : null);
    if (!isStaff(user)) {
      delete item.ownerId; delete item.rejectionReason;
      item.description = 'Phản ánh cùng loại trong khu vực lân cận.';
      item.thumbnail = null;
    }
    return { ...item, distanceMeters: Math.round(distance), similarity: Math.round(Math.max(0, 100 - distance / 4)) };
  }).filter(Boolean).sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 10);
}
