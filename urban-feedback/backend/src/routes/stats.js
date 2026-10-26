import { Router } from 'express';
import { query } from '../db.js';
import { asyncRoute, statuses } from '../lib.js';
import { filters, reportFrom } from '../report-store.js';

const router = Router();

router.get('/', asyncRoute(async (req, res) => {
  const { where, params } = filters(req.user, req.query);
  // Materialize the authorized scope once so all aggregates use exactly the same
  // reports. Resolve the latest closure before aggregating to avoid aggregate /
  // correlated-subquery combinations unsupported by SQL Server.
  const result = await query(`
    SELECT pa.MaPhanAnh AS reportId, pa.TrangThai AS status, pa.NgayGui AS createdAt,
      pa.MaLoai AS categoryId, lpa.TenLoai AS categoryName, pc.MaDonVi AS unitId,
      dv.TenDonVi AS unitName, pc.HanXuLy AS dueAt, pc.TrangThai AS assignmentStatus,
      CASE WHEN pa.TrangThai='CLOSED' AND closure.closedAt IS NOT NULL
        THEN CAST(DATEDIFF_BIG(SECOND, pa.NgayGui, closure.closedAt) AS FLOAT)/86400.0
        ELSE NULL END AS resolutionDays
    INTO #ScopedReports
    ${reportFrom}
    OUTER APPLY (
      SELECT TOP (1) ls.ThoiGian AS closedAt
      FROM dbo.LichSuTrangThai ls
      WHERE ls.MaPhanAnh=pa.MaPhanAnh AND ls.TrangThaiMoi='CLOSED'
        AND (ls.TrangThaiCu IS NULL OR ls.TrangThaiCu<>'CLOSED')
      ORDER BY ls.ThoiGian DESC,ls.MaLichSu DESC
    ) closure
    WHERE ${where};

    SELECT COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status='SUBMITTED' THEN 1 ELSE 0 END),0) AS submitted,
      COALESCE(SUM(CASE WHEN status IN ('ASSIGNED','IN_PROGRESS','WAITING_ACCEPTANCE') THEN 1 ELSE 0 END),0) AS inProgress,
      COALESCE(SUM(CASE WHEN status='CLOSED' THEN 1 ELSE 0 END),0) AS closed,
      COALESCE(SUM(CASE WHEN status NOT IN ('CLOSED','REJECTED')
        AND assignmentStatus IN ('ASSIGNED','ACCEPTED')
        AND dueAt<SYSUTCDATETIME() THEN 1 ELSE 0 END),0) AS overdue,
      COALESCE(AVG(resolutionDays),0) AS averageDays
    FROM #ScopedReports;

    SELECT status,COUNT(*) AS count FROM #ScopedReports GROUP BY status;
    SELECT categoryId AS id,categoryName AS name,COUNT(*) AS count
      FROM #ScopedReports GROUP BY categoryId,categoryName ORDER BY count DESC,name;
    SELECT unitId AS id,unitName AS name,COUNT(*) AS count
      FROM #ScopedReports WHERE unitId IS NOT NULL GROUP BY unitId,unitName ORDER BY count DESC,name;
    SELECT CONVERT(CHAR(7),createdAt,126) AS month,COUNT(*) AS count,
      SUM(CASE WHEN status='CLOSED' THEN 1 ELSE 0 END) AS closed
      FROM #ScopedReports GROUP BY CONVERT(CHAR(7),createdAt,126) ORDER BY month;
    DROP TABLE #ScopedReports;
  `, params);
  const [totals, statusRows, byCategory, byUnit, byMonth] = result.recordsets;
  const summary = totals[0];
  const counts = new Map(statusRows.map(row => [row.status, row.count]));
  res.json({
    ...summary,
    averageDays: Math.round(Number(summary.averageDays) * 10) / 10,
    resolutionRate: summary.total ? Math.round(summary.closed / summary.total * 1000) / 10 : 0,
    byStatus: statuses.map(status => ({ status, count: counts.get(status) || 0 })),
    byCategory, byUnit, byMonth,
  });
}));

export default router;
