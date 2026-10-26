import { randomBytes } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function readIfExists(file) {
  try { return await readFile(file, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function saveNew(file, contents) {
  try { await writeFile(file, contents, { flag: 'wx', mode: 0o600 }); return true; }
  catch (error) { if (error.code === 'EEXIST') return false; throw error; }
}
const rootEnv = path.join(root, '.env');
await saveNew(rootEnv, `SQL_PASSWORD=DoThi!${randomBytes(24).toString('base64url')}\n`);
const rootText = await readIfExists(rootEnv);
const match = /^SQL_PASSWORD=(.+)$/m.exec(rootText || '');
if (!match) throw new Error('Cần khai báo SQL_PASSWORD trong .env ở thư mục gốc.');
const backendEnv = path.join(root, 'backend', '.env');
const created = await saveNew(backendEnv, [
  'PORT=4000', 'NODE_ENV=development', 'SQL_HOST=127.0.0.1', 'SQL_PORT=1433',
  'SQL_DATABASE=QuanLyPhanAnhHaTangDoThi', 'SQL_USER=sa', `SQL_PASSWORD=${match[1].trim()}`,
  'SQL_ENCRYPT=false', 'SQL_TRUST_SERVER_CERTIFICATE=true',
  `JWT_SECRET=${randomBytes(48).toString('base64url')}`,
  'FRONTEND_URL=http://localhost:5173', 'CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173', ''
].join('\n'));
await Promise.all([rootEnv, backendEnv].map(file => chmod(file, 0o600).catch(() => {})));
console.log(created ? 'Đã tạo cấu hình phát triển cục bộ. Các giá trị bí mật không được in ra.' : 'Giữ nguyên cấu hình hiện có.');
