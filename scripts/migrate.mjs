import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run database migrations.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const migration = await readFile(
    new URL('../db/migrations/001_initial.sql', import.meta.url),
    'utf8',
  );
  await pool.query(migration);
  console.log('Database migration completed.');
} finally {
  await pool.end();
}
