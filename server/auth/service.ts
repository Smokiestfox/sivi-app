import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "../db/client";
import { adminProfiles, sessions, users } from "../db/schema";
import { ForumError } from "../forum/errors";
import { authCookie, authOrigin, readAuthCookie } from "./config";
import { assertStudent, assertUser } from "./guards";

const sessionSeconds = 30 * 24 * 60 * 60;
const sessionTokenPattern = /^[A-Za-z0-9_-]{43}$/;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookie(origin: string, maxAge = sessionSeconds) {
  return authCookie(origin, "sivi_session", maxAge);
}

function sessionHashFromRequest(cookieHeader: string | null, origin: string) {
  const token = readAuthCookie(cookieHeader, sessionCookie(origin).name);
  return token && sessionTokenPattern.test(token) ? tokenHash(token) : null;
}

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  hostedDomain?: string;
};

export async function createGoogleSession(profile: GoogleProfile, request: Request, origin: string) {
  const { googleId, hostedDomain, ...identity } = profile;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase());
  const googleManagesEmail = identity.email.endsWith("@gmail.com") || Boolean(hostedDomain);
  const provisionAdmin = googleManagesEmail && adminEmails.includes(identity.email);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionSeconds * 1000);
  const previousHash = sessionHashFromRequest(request.headers.get("cookie"), origin);

  await db.transaction(async (tx) => {
    const [{ id, role }] = await tx.insert(users).values({
      googleId, ...identity, role: provisionAdmin ? "admin" : "guest",
    }).onConflictDoUpdate({
      target: users.googleId,
      set: { ...identity, ...(provisionAdmin ? { role: "admin" as const } : {}), updatedAt: new Date() },
    }).returning({ id: users.id, role: users.role });

    if (role === "admin") {
      await tx.insert(adminProfiles).values({ userId: id }).onConflictDoNothing();
    }
    if (previousHash) await tx.delete(sessions).where(eq(sessions.tokenHash, previousHash));
    await tx.insert(sessions).values({ tokenHash: tokenHash(token), userId: id, expiresAt });
  });

  return token;
}

export async function getCurrentUser(request?: Request) {
  const requestHeaders = request?.headers ?? await headers();
  const hash = sessionHashFromRequest(requestHeaders.get("cookie"), authOrigin());
  if (!hash) return null;

  const [user] = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    avatarUrl: users.avatarUrl,
    role: users.role,
    isVerified: users.isVerified,
    universityId: users.universityId,
    universityEmail: users.universityEmail,
  }).from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return user ?? null;
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(request?: Request) {
  return assertUser(await getCurrentUser(request));
}

export async function requireStudent(request?: Request) {
  return assertStudent(await getCurrentUser(request));
}

export async function requireAdmin(request?: Request) {
  const user = await requireUser(request);
  if (user.role !== "admin") throw new ForumError("FORBIDDEN", "Bạn không có quyền quản trị.");
  return user;
}

export async function logout(request: Request) {
  const origin = authOrigin();
  if (request.headers.get("origin") !== origin) {
    throw new ForumError("FORBIDDEN", "Nguồn yêu cầu không hợp lệ.");
  }

  const hash = sessionHashFromRequest(request.headers.get("cookie"), origin);
  if (hash) await db.delete(sessions).where(eq(sessions.tokenHash, hash));

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set({ ...sessionCookie(origin, 0), value: "" });
  response.cookies.set({ ...authCookie(origin, "sivi_oauth", 0), value: "" });
  return response;
}
