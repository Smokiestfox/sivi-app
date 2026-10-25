import { route } from '@/lib/route';
import { currentUser, hashToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { requireSameOrigin } from '@/lib/http';
import { cookies } from 'next/headers';

export const GET = route(async () => {
  return Response.json({ user: await currentUser() });
});

export const DELETE = route(async (request) => {
  requireSameOrigin(request);
  const jar = await cookies();
  const token = jar.get('sivi_session')?.value;
  if (token) {
    await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
  }
  const response = Response.json({ ok: true });
  jar.delete('sivi_session');
  return response;
});
