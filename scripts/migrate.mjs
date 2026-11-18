import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./server/db/migrations" });
} finally {
  await pool.end();
}
