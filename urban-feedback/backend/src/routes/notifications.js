import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, asyncRoute, requireAuth, pagination } from '../lib.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncRoute(async (req, res) => {
  const { page, pageSize, offset } = pagination({ ...req.query, pageSize: req.query.pageSize || 50 });
  let readState = null;
  if (req.query.unread !== undefined) {
    if (!['true', 'false'].includes(req.query.unread)) throw new HttpError(400, 'Bộ lọc thông báo không hợp lệ.');
    readState = req.query.unread === 'false';
  } else if (req.query.read !== undefined || req.query.filter !== undefined) {
    const value = req.query.read ?? req.query.filter;
    if (!['unread', 'read', 'all'].includes(value)) throw new HttpError(400, 'Bộ lọc thông báo không hợp lệ.');
    readState = value === 'all' ? null : value === 'read';
  }
  const filtered = readState === null ? '' : ' AND DaDoc=@readState';
  const result = await query(`SELECT MaThongBao AS id, TieuDe AS title, NoiDung AS message,
    MaPhanAnh AS reportId, LoaiThongBao AS type, DaDoc AS [read], ThoiGian AS createdAt
    FROM dbo.ThongBao WHERE MaNguoiDung=@userId${filtered}
    ORDER BY ThoiGian DESC, MaThongBao DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    SELECT COUNT(*) AS total FROM dbo.ThongBao WHERE MaNguoiDung=@userId${filtered};
    SELECT COUNT(*) AS allTotal, COALESCE(SUM(CASE WHEN DaDoc=0 THEN 1 ELSE 0 END),0) AS unread
    FROM dbo.ThongBao WHERE MaNguoiDung=@userId;`, { userId: req.user.id, offset, pageSize, readState });
  const total = result.recordsets[1][0].total;
  const counts = result.recordsets[2][0];
  res.json({ items: result.recordset, unread: counts.unread, total, allTotal: counts.allTotal, page, pageSize });
}));

router.patch('/:id/read', asyncRoute(async (req, res) => {
  const result = await query('UPDATE dbo.ThongBao SET DaDoc=1 WHERE MaThongBao=@id AND MaNguoiDung=@userId', { id: req.params.id, userId: req.user.id });
  if (!result.rowsAffected[0]) throw new HttpError(404, 'Không tìm thấy thông báo.');
  res.json({ message: 'Đã đánh dấu thông báo là đã đọc.' });
}));

router.post('/read-all', asyncRoute(async (req, res) => {
  await query('UPDATE dbo.ThongBao SET DaDoc=1 WHERE MaNguoiDung=@userId AND DaDoc=0', { userId: req.user.id });
  res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
}));

export default router;
