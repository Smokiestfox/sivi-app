import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "../db/client";
import { sessions, users } from "../db/schema";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "guest" | "student" | "admin";
  isVerified: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get("sivi_session")?.value;
  if (!token) return null;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [user] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    avatarUrl: users.avatarUrl,
    role: users.role,
    isVerified: users.isVerified,
  })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return user ?? null;
}
