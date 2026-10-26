import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticate, mutationOrigin } from './security.js';
import { asyncRoute, HttpError } from './lib.js';
import { query } from './db.js';
import auth from './routes/auth.js';
import admin from './routes/admin.js';
import meta from './routes/meta.js';
import notifications from './routes/notifications.js';
import reports from './routes/reports.js';
import uploads, { serveUpload } from './routes/uploads.js';
import reopens from './routes/reopens.js';
import stats from './routes/stats.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  const originList = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000,http://127.0.0.1:4000')
    .split(',').map(value => value.trim()).filter(Boolean);
  for (const local of ['http://localhost:4000', 'http://127.0.0.1:4000']) if (!originList.includes(local)) originList.push(local);
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'], connectSrc: ["'self'"], fontSrc: ["'self'", 'data:'], objectSrc: ["'none'"], upgradeInsecureRequests: null } }, crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin(origin, callback) { callback(null, !origin || originList.includes(origin)); }, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '256kb' }));
  app.use((req, res, next) => { req.body ||= {}; next(); });
  app.use(mutationOrigin(originList));
  app.get('/api/health', asyncRoute(async (req, res) => {
    try {
      const ready = (await query('SELECT 1 AS ok')).recordset[0].ok === 1;
      res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable', database: 'SQL Server' });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'SQL Server', message: 'Chưa kết nối được SQL Server. Kiểm tra cấu hình và khởi động cơ sở dữ liệu.' });
    }
  }));
  // Demo scene photos contain no user content; user-uploaded files use authorization below.
  app.use('/demo', express.static(fileURLToPath(new URL('../public/demo/', import.meta.url)), { dotfiles: 'deny', fallthrough: false, maxAge: '1d' }));
  // Static React assets must stay available even if the database is temporarily down.
  app.use(['/api', '/uploads'], authenticate);
  app.get('/uploads/:name', serveUpload);
  app.use('/api/auth', auth);
  app.use('/api/meta', meta);
  app.use('/api/reports', reports);
  app.use('/api/uploads', uploads);
  app.use('/api/reopens', reopens);
  app.use('/api/notifications', notifications);
  app.use('/api/admin', admin);
  app.use('/api/stats', stats);
  app.use('/api', (req, res, next) => next(new HttpError(404, 'Không tìm thấy API.')));
  const dist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.use((req, res, next) => {
      if (req.method === 'GET' && req.accepts('html') && !req.path.startsWith('/uploads/')) return res.sendFile(path.join(dist, 'index.html'));
      next();
    });
  }
  app.use((req, res, next) => next(new HttpError(404, 'Không tìm thấy trang hoặc tài nguyên.')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Mỗi ảnh không được vượt quá 5 MB.' });
    if (error.name === 'MulterError') return res.status(400).json({ message: 'Chỉ được tải tối đa 5 ảnh qua trường files.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Nội dung JSON không hợp lệ.' });
    const sqlNumber = error.number || error.originalError?.info?.number;
    if (['ESOCKET', 'ETIMEOUT', 'ELOGIN', 'ECONNCLOSED', 'ENOTOPEN', 'ECONNREFUSED'].includes(error.code)) return res.status(503).json({ message: 'Dịch vụ tạm thời gián đoạn. Vui lòng thử lại sau.' });
    if ([2601, 2627].includes(sqlNumber)) return res.status(409).json({ message: 'Dữ liệu đã tồn tại hoặc thao tác đã được thực hiện. Vui lòng tải lại.' });
    if (sqlNumber === 1205) return res.status(409).json({ message: 'Có người khác đang cập nhật dữ liệu. Vui lòng thử lại.' });
    if (sqlNumber === 547) return res.status(400).json({ message: 'Dữ liệu liên quan không hợp lệ hoặc đang được sử dụng.' });
    const status = error.status && error.status >= 400 && error.status <= 599 ? error.status : 500;
    if (status >= 500) console.error('Request failed:', error.code || error.name, error.message);
    res.status(status).json({ message: status >= 500 ? 'Hệ thống tạm thời không thể xử lý yêu cầu. Vui lòng thử lại.' : error.message, ...(error.extra || {}) });
  });
  return app;
}
export default createApp;
