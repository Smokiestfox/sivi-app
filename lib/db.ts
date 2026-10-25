import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { HttpError } from '@/lib/http';

const globalForPg = globalThis as typeof globalThis & { siviPool?: Pool };

export const db =
  globalForPg.siviPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== 'production') globalForPg.siviPool = db;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  if (!process.env.DATABASE_URL) {
    throw new HttpError(503, 'Cơ sở dữ liệu chưa được cấu hình trên máy chủ.');
  }
  try {
    return await db.query<T>(text, values);
  } catch (error) {
    if (isConnectionError(error)) throw new HttpError(503, 'Cơ sở dữ liệu tạm thời chưa sẵn sàng.');
    throw error;
  }
}

export async function transaction<T>(action: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL) {
    throw new HttpError(503, 'Cơ sở dữ liệu chưa được cấu hình trên máy chủ.');
  }
  let client: PoolClient;
  try {
    client = await db.connect();
  } catch (error) {
    if (isConnectionError(error)) throw new HttpError(503, 'Cơ sở dữ liệu tạm thời chưa sẵn sàng.');
    throw error;
  }
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function isConnectionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', '57P03'].includes(String(error.code))
  );
}
