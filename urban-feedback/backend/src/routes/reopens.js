import { Router } from 'express';
import { query, transaction } from '../db.js';
import { HttpError, asyncRoute, requireRoles, text, pagination } from '../lib.js';
import { addHistory, notify, lockedReport } from '../report-store.js';

const router = Router();
router.use(requireRoles('VT02', 'VT04', 'VT05'));
router.get('/', asyncRoute(async (req, res) => {
  const status = req.query.status || '';
  if (status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) throw new HttpError(400, 'Trạng thái yêu cầu không hợp lệ.');
  const { page, pageSize, offset } = pagination(req.query);
  const where = status ? 'WHERE yc.TrangThai=@status' : '';
  const total = (await query(`SELECT COUNT(*) AS total FROM dbo.YeuCauXemXetLai yc ${where}`, { status })).recordset[0].total;
  const items = (await query(`SELECT yc.MaYeuCau AS id,yc.MaPhanAnh AS reportId,pa.TieuDe AS reportTitle,yc.LyDo AS reason,yc.NoiDung AS description,
    yc.TrangThai AS status,yc.NgayYeuCau AS createdAt,COALESCE(yc.GhiChuXuLy,yc.LyDoTuChoi) AS note
    FROM dbo.YeuCauXemXetLai yc JOIN dbo.PhanAnh pa ON pa.MaPhanAnh=yc.MaPhanAnh ${where}
    ORDER BY yc.NgayYeuCau DESC,yc.MaYeuCau DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`, { status, offset, pageSize })).recordset;
  res.json({ items, total, page, pageSize });
}));
router.post('/:id/decision', asyncRoute(async (req, res) => {
  if (typeof req.body.approved !== 'boolean') throw new HttpError(400, 'Vui lòng chọn quyết định hợp lệ.');
  const note = text(req.body.note, 'Nhận xét xử lý', { required: true, min: 3, max: 1000 });
  const approved = req.body.approved;
  // The request's report FK is immutable. Resolve it before starting the
  // SERIALIZABLE transaction, so competing decisions do not retain shared
  // request locks while waiting for the report's update lock.
  const existing = (await query('SELECT MaPhanAnh AS reportId FROM dbo.YeuCauXemXetLai WHERE MaYeuCau=@id', { id: req.params.id })).recordset[0];
  if (!existing) throw new HttpError(404, 'Không tìm thấy yêu cầu xem xét lại.');
  const reopen = await transaction(async tx => {
    // Lock the report before the request, consistent with report-side actions.
    const report = await lockedReport(existing.reportId, tx);
    const row = (await query('SELECT MaYeuCau AS id,MaPhanAnh AS reportId,MaNguoiDung AS ownerId,TrangThai AS status FROM dbo.YeuCauXemXetLai WITH(UPDLOCK,HOLDLOCK) WHERE MaYeuCau=@id', { id: req.params.id }, tx)).recordset[0];
    if (!row || row.reportId !== report.id) throw new HttpError(404, 'Không tìm thấy yêu cầu xem xét lại.');
    if (row.status !== 'PENDING') throw new HttpError(409, 'Yêu cầu đã được xử lý. Vui lòng tải lại.');
    if (report.status !== 'CLOSED') throw new HttpError(409, 'Phản ánh đã thay đổi trạng thái, không thể xử lý yêu cầu này.');
    await query(`UPDATE dbo.YeuCauXemXetLai SET TrangThai=@status,MaNguoiXuLy=@actorId,GhiChuXuLy=@note,LyDoTuChoi=@reason WHERE MaYeuCau=@id`,
    { id: row.id, status: approved ? 'APPROVED' : 'REJECTED', actorId: req.user.id, note, reason: approved ? null : note }, tx);
    if (approved) {
      await query(`UPDATE dbo.PhanAnh SET TrangThai='REOPENED' WHERE MaPhanAnh=@id AND TrangThai='CLOSED'`, { id: report.id }, tx);
      await addHistory(tx, report.id, req.user.id, 'CLOSED', 'REOPENED', note);
      await notify(tx, { roles: ['VT02'], reportId: report.id, title: 'Phản ánh được mở lại, chờ phân công', message: report.title, type: 'REOPENED' });
    }
    await notify(tx, { users: [row.ownerId], reportId: report.id, title: approved ? 'Yêu cầu xem xét lại được chấp nhận' : 'Kết quả xem xét lại', message: note, type: approved ? 'REOPENED' : 'REOPEN_REJECTED' });
    return { id: row.id, reportId: report.id, status: approved ? 'APPROVED' : 'REJECTED', note };
  });
  res.json({ reopen });
}));
export default router;
