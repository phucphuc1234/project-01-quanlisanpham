import { Router } from 'express';
import { query, transaction } from '../db.js';
import { HttpError, asyncRoute, requireAuth, requireRoles, id, text, location, priorities } from '../lib.js';
import { listReports, detail, lockedReport, addHistory, notify, checkCategory, duplicates } from '../report-store.js';
import { validateImages } from './uploads.js';
import { ReportWorkflowService } from '../services/report-workflow.service.js';
import { ReportWorkflowPolicy } from '../services/workflow-policy.js';

const router = Router();
router.get('/', asyncRoute(async (req, res) => res.json(await listReports(req.user, req.query))));

async function logDuplicateChecks(tx, user, input, candidates, sourceId = null) {
  for (const candidate of candidates.length ? candidates : [null]) {
    await query(`INSERT dbo.KiemTraTrung(MaKiemTra,MaPhanAnhNguon,MaPhanAnhTuongTu,MaLoai,NguoiKiemTra,ViTri,MucDoTuongTu,KetQua,GhiChu,ThoiGianKiemTra)
      VALUES(@id,@sourceId,@similarId,@categoryId,@userId,@address,@similarity,@result,@note,SYSUTCDATETIME())`,
    { id: id('KT'), sourceId, similarId: candidate?.id || null, categoryId: input.categoryId, userId: user.id,
      address: input.address, similarity: candidate?.similarity ?? null, result: candidate ? (candidate.distanceMeters <= 30 ? 'TRUNG' : 'TUONG_TU') : 'KHONG_TRUNG', note: 'Kiểm tra cùng loại trong bán kính 200m, 30 ngày gần nhất.' }, tx);
  }
}
router.post('/check-duplicates', requireAuth, asyncRoute(async (req, res) => {
  const input = { ...location(req.body), categoryId: text(req.body.categoryId, 'Loại phản ánh', { required: true, max: 20 }), address: text(req.body.address, 'Địa chỉ', { required: true, max: 255 }) };
  const items = await duplicates(input, req.user);
  await transaction(tx => logDuplicateChecks(tx, req.user, input, items));
  res.json({ items, radiusMeters: 200 });
}));
router.post('/', requireRoles('VT01', 'VT05'), asyncRoute(async (req, res) => {
  const input = {
    title: text(req.body.title, 'Tiêu đề', { required: true, min: 5, max: 200 }),
    description: text(req.body.description, 'Nội dung', { required: true, min: 10, max: 10000 }),
    categoryId: text(req.body.categoryId, 'Loại phản ánh', { required: true, max: 20 }),
    address: text(req.body.address, 'Địa chỉ', { required: true, min: 5, max: 255 }),
    ...location(req.body), priority: req.body.priority || 'NORMAL',
  };
  if (!priorities.includes(input.priority)) throw new HttpError(400, 'Mức độ ưu tiên không hợp lệ.');
  const images = await validateImages(req.body.images, req.user, { required: true });
  const candidates = await duplicates(input, req.user);
  if (candidates.length && req.body.confirmDuplicate !== true) throw new HttpError(409, 'Có phản ánh tương tự trong khu vực. Vui lòng xem và xác nhận trước khi tiếp tục gửi.', { duplicates: candidates });
  const reportId = id('PA');
  await transaction(async tx => {
    await checkCategory(input.categoryId, tx);
    await query(`INSERT dbo.PhanAnh(MaPhanAnh,MaNguoiDung,MaLoai,TieuDe,NoiDung,ViTri,ToaDo,MucDoUuTien,NgayGui)
      VALUES(@reportId,@userId,@categoryId,@title,@description,@address,@coordinates,@priority,SYSUTCDATETIME())`,
    { ...input, reportId, userId: req.user.id, coordinates: `${input.latitude},${input.longitude}` }, tx);
    for (const url of images) await query(`INSERT dbo.HinhAnhPhanAnh(MaHinhAnh,MaPhanAnh,DuongDan,LoaiAnh,ThoiGianTao) VALUES(@id,@reportId,@url,'SU_CO',SYSUTCDATETIME())`, { id: id('HA'), reportId, url }, tx);
    await addHistory(tx, reportId, req.user.id, null, 'SUBMITTED', 'Người dân gửi phản ánh.');
    await logDuplicateChecks(tx, req.user, input, candidates, reportId);
    await notify(tx, { roles: ['VT02'], reportId, title: 'Phản ánh mới cần tiếp nhận', message: input.title, type: 'SUBMITTED' });
  });
  res.status(201).json({ report: await detail(reportId, req.user) });
}));
router.get('/:id', asyncRoute(async (req, res) => res.json(await detail(req.params.id, req.user))));

const workflow = new ReportWorkflowService();
router.post('/:id/actions', requireAuth, asyncRoute(async (req, res) => {
  await workflow.execute(req.params.id, req.user, req.body);
  res.json({ report: await detail(req.params.id, req.user) });
}));

router.post('/:id/feedback', requireAuth, asyncRoute(async (req, res) => {
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Mức độ hài lòng phải từ 1 đến 5.');
  const comment = text(req.body.comment, 'Nhận xét', { max: 1000 });
  const feedbackId = id('PH');
  await transaction(async tx => {
    const row = await lockedReport(req.params.id, tx);
    if (row.ownerId !== req.user.id) throw new HttpError(403, 'Chỉ người gửi phản ánh được đánh giá kết quả.');
    ReportWorkflowPolicy.assertState(row, ['CLOSED']);
    const count = (await query(`SELECT COUNT(*) AS count FROM dbo.PhanHoi WHERE MaPhanAnh=@reportId AND NgayPhanHoi>=COALESCE((SELECT MAX(ThoiGian) FROM dbo.LichSuTrangThai WHERE MaPhanAnh=@reportId AND TrangThaiMoi='CLOSED'),CAST('1900-01-01' AS DATETIME2))`, { reportId: row.id }, tx)).recordset[0].count;
    if (count) throw new HttpError(409, 'Bạn đã đánh giá lần xử lý này.');
    await query(`INSERT dbo.PhanHoi(MaPhanHoi,MaPhanAnh,MaNguoiDung,MucDoHaiLong,NoiDung,NgayPhanHoi) VALUES(@id,@reportId,@userId,@rating,@comment,SYSUTCDATETIME())`, { id: feedbackId, reportId: row.id, userId: req.user.id, rating, comment }, tx);
  });
  res.status(201).json({ feedback: { id: feedbackId, rating, comment, createdAt: new Date().toISOString() } });
}));
router.post('/:id/reopen', requireAuth, asyncRoute(async (req, res) => {
  const reason = text(req.body.reason, 'Lý do xem xét lại', { required: true, min: 5, max: 1000 });
  const description = text(req.body.description, 'Nội dung đề nghị', { max: 2000 });
  const reopenId = id('YC');
  await transaction(async tx => {
    const row = await lockedReport(req.params.id, tx);
    if (row.ownerId !== req.user.id) throw new HttpError(403, 'Chỉ người gửi phản ánh được yêu cầu xem xét lại.');
    ReportWorkflowPolicy.assertState(row, ['CLOSED']);
    const feedback = (await query(`SELECT TOP(1) MucDoHaiLong AS rating FROM dbo.PhanHoi WHERE MaPhanAnh=@reportId AND MaNguoiDung=@userId AND NgayPhanHoi>=COALESCE((SELECT MAX(ThoiGian) FROM dbo.LichSuTrangThai WHERE MaPhanAnh=@reportId AND TrangThaiMoi='CLOSED'),CAST('1900-01-01' AS DATETIME2)) ORDER BY NgayPhanHoi DESC,MaPhanHoi DESC`, { reportId: row.id, userId: req.user.id }, tx)).recordset[0];
    if (!feedback || feedback.rating > 2) throw new HttpError(409, 'Bạn cần gửi đánh giá chưa hài lòng (1 hoặc 2 sao) trước khi yêu cầu xem xét lại.');
    if ((await query(`SELECT MaYeuCau FROM dbo.YeuCauXemXetLai WHERE MaPhanAnh=@reportId AND TrangThai='PENDING'`, { reportId: row.id }, tx)).recordset.length) throw new HttpError(409, 'Đã có yêu cầu xem xét lại đang chờ xử lý.');
    await query(`INSERT dbo.YeuCauXemXetLai(MaYeuCau,MaPhanAnh,MaNguoiDung,LyDo,NoiDung,NgayYeuCau) VALUES(@id,@reportId,@userId,@reason,@description,SYSUTCDATETIME())`, { id: reopenId, reportId: row.id, userId: req.user.id, reason, description }, tx);
    await notify(tx, { roles: ['VT02', 'VT04'], reportId: row.id, title: 'Yêu cầu xem xét lại từ người dân', message: reason, type: 'REOPEN_REQUEST' });
  });
  res.status(201).json({ reopen: { id: reopenId, reason, description, status: 'PENDING', createdAt: new Date().toISOString() } });
}));
export default router;
