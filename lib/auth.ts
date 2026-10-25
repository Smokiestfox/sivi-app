import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/http';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: 'guest' | 'student' | 'admin';
  is_verified: boolean;
  university_id: string | null;
  university_email: string | null;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval \'30 days\')',
    [hashToken(token), userId],
  );
  return token;
}

export async function currentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get('sivi_session')?.value;
  if (!token) return null;
  const result = await query<AuthUser>(
    `SELECT u.id, u.email, u.name, u.avatar, u.role, u.is_verified,
            u.university_id, u.university_email
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Vui lòng đăng nhập để tiếp tục.');
  return user;
}

export async function requireStudent(): Promise<AuthUser> {
  const user = await requireUser();
  if (!user.is_verified || !['student', 'admin'].includes(user.role)) {
    throw new HttpError(403, 'Bạn cần xác thực email sinh viên để thực hiện thao tác này.');
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== 'admin') throw new HttpError(403, 'Bạn không có quyền quản trị.');
  return user;
}
