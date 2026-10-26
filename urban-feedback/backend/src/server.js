import './db.js';
import { getPool, closePool } from './db.js';
import { createApp } from './app.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Cần JWT_SECRET tối thiểu 32 ký tự trong backend/.env.');
const app = createApp();
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, '0.0.0.0', () => console.log(`Urban Feedback API đang chạy tại cổng ${port} (SQL Server).`));
getPool().then(() => console.log('SQL Server đã kết nối.')).catch(error => {
  console.error(`SQL Server chưa sẵn sàng (${error.code || 'CONNECTION_ERROR'}). API sẽ thử kết nối lại khi có yêu cầu; /api/health trả 503 cho đến khi kết nối thành công.`);
});
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
  server.close(async () => { await closePool(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
});
