import sql from 'mssql';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
let poolPromise;

export { sql };
export function config(database = process.env.SQL_DATABASE || 'QuanLyPhanAnhHaTangDoThi') {
  if (!process.env.SQL_PASSWORD) throw new Error('Thiếu SQL_PASSWORD trong backend/.env.');
  return {
    server: process.env.SQL_HOST || '127.0.0.1',
    port: Number(process.env.SQL_PORT || 1433),
    database,
    user: process.env.SQL_USER || 'sa',
    password: process.env.SQL_PASSWORD,
    connectionTimeout: Number(process.env.SQL_CONNECTION_TIMEOUT_MS || 5000),
    requestTimeout: 30000,
    options: {
      encrypt: process.env.SQL_ENCRYPT !== 'false',
      trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true',
      useUTC: true,
      enableArithAbort: true,
      abortTransactionOnError: true,
    },
    pool: { max: 12, min: 0, idleTimeoutMillis: 30000 },
  };
}
export function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(config());
    pool.on('error', error => console.error('SQL connection error:', error.code || 'UNKNOWN'));
    poolPromise = pool.connect().catch(error => { poolPromise = undefined; throw error; });
  }
  return poolPromise;
}
export async function query(statement, params = {}, executor) {
  const request = new sql.Request(executor || await getPool());
  for (const [name, value] of Object.entries(params)) {
    if (value instanceof Date) request.input(name, sql.DateTime2, value);
    else if (typeof value === 'boolean') request.input(name, sql.Bit, value);
    else if (typeof value === 'number' && Number.isInteger(value)) request.input(name, sql.Int, value);
    else if (typeof value === 'number') request.input(name, sql.Float, value);
    else request.input(name, sql.NVarChar(sql.MAX), value == null ? null : String(value));
  }
  return request.query(statement);
}
export async function transaction(fn) {
  const tx = new sql.Transaction(await getPool());
  let aborted = false;
  tx.on('rollback', () => { aborted = true; });
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (error) {
    if (!aborted) await tx.rollback().catch(() => {});
    throw error;
  }
}
export async function closePool() {
  if (poolPromise) await (await poolPromise).close();
  poolPromise = undefined;
}
