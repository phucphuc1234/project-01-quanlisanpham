import 'dotenv/config';
import sql from 'mssql';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const database = process.env.SQL_DATABASE || 'QuanLyPhanAnhHaTangDoThi';
if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(database)) {
  throw new Error('SQL_DATABASE phải là tên cơ sở dữ liệu hợp lệ (chữ, số và dấu gạch dưới).');
}
if (!process.env.SQL_PASSWORD) throw new Error('Thiếu SQL_PASSWORD trong backend/.env.');

const config = {
  server: process.env.SQL_HOST || '127.0.0.1',
  port: Number(process.env.SQL_PORT || 1433),
  user: process.env.SQL_USER || 'sa',
  password: process.env.SQL_PASSWORD,
  database: 'master',
  connectionTimeout: 30000,
  requestTimeout: 60000,
  options: {
    encrypt: process.env.SQL_ENCRYPT !== 'false',
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
};

const requiredTables = [
  'VaiTro', 'DonViXuLy', 'NguoiDung', 'LoaiPhanAnh', 'PhanAnh',
  'HinhAnhPhanAnh', 'KiemTraTrung', 'PhanCong', 'TienDoXuLy',
  'KetQuaXuLy', 'NghiemThu', 'PhanHoi', 'YeuCauXemXetLai',
  'ThongBao', 'LichSuTrangThai',
];

let pool;
try {
  pool = await new sql.ConnectionPool(config).connect();
  const exists = await pool.request().input('name', sql.NVarChar(128), database)
    .query('SELECT DB_ID(@name) AS id');
  if (exists.recordset[0].id === null) {
    // Identifier is explicitly validated above; all data values use parameters.
    await pool.request().batch(`CREATE DATABASE [${database}]`);
    console.log(`Đã tạo cơ sở dữ liệu ${database}.`);
  }
  await pool.close();
  pool = await new sql.ConnectionPool({ ...config, database }).connect();
  const existing = await pool.request().query("SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo')");
  const present = new Set(existing.recordset.map(row => row.name));
  const found = requiredTables.filter(name => present.has(name));
  if (found.length && found.length !== requiredTables.length) {
    throw new Error(`CSDL đã có schema chưa đầy đủ (${found.length}/15 bảng). Không tự sửa hoặc xóa dữ liệu; hãy sao lưu và kiểm tra schema trước.`);
  }

  const schemaFile = fileURLToPath(new URL('../../database/001-schema.sql', import.meta.url));
  const source = await readFile(schemaFile, 'utf8');
  const batches = source.split(/^\s*GO\s*(?:--[^\n]*)?$/gmi).map(batch => batch.trim()).filter(Boolean);
  // The original attachment remains byte-for-byte intact. Its CREATE DATABASE
  // and USE batches are replaced at runtime by the configured safe connection.
  const schemaBatches = batches.slice(2);
  if (!schemaBatches.some(batch => /CREATE TABLE dbo\.PhanAnh\b/i.test(batch))) {
    throw new Error('Không nhận diện được schema nguồn; dừng để bảo vệ CSDL.');
  }

  if (found.length === requiredTables.length) {
    // Repeated setup does not reinsert reference rows or overwrite application
    // data. Refresh only the three non-destructive reporting views.
    for (const batch of schemaBatches.filter(batch => /CREATE OR ALTER VIEW\b/i.test(batch))) {
      await pool.request().batch(batch);
    }
    console.log('Schema đã có đủ 15 bảng; giữ nguyên dữ liệu, đã kiểm tra/cập nhật các view.');
  } else {
    if (present.size) {
      throw new Error('CSDL không rỗng nhưng chưa có schema dự án. Hãy chọn CSDL sạch thay vì ghi vào CSDL hiện có.');
    }
    for (const [index, batch] of schemaBatches.entries()) {
      try {
        await pool.request().batch(batch);
      } catch (error) {
        throw new Error(`Không khởi tạo được batch schema ${index + 3}: ${error.message}`, { cause: error });
      }
    }
    console.log('Đã nạp schema gốc: 15 bảng, vai trò, danh mục, đơn vị và 3 view.');
  }
} catch (error) {
  console.error(`Khởi tạo CSDL thất bại: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (pool) await pool.close();
}
