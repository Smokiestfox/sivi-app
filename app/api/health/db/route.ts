import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: "up" });
  } catch (error) {
    console.error("Database health check failed:", error);
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
}
