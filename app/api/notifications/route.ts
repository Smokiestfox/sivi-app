import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { route } from '@/lib/route';
import { readJson, requireSameOrigin } from '@/lib/http';

export const GET = route(async () => {
  const user = await requireUser();
  const result = await query(
    'SELECT id, title, message, type, read, created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
    [user.id],
  );
  return Response.json({ notifications: result.rows });
});

export const PATCH = route(async (request) => {
  requireSameOrigin(request);
  const user = await requireUser();
  const body = await readJson(request);
  if (typeof body.id !== 'string') return Response.json({ error: 'Thông báo không hợp lệ.' }, { status: 400 });
  const result = await query(
    'UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2 RETURNING id',
    [body.id, user.id],
  );
  if (!result.rows[0]) return Response.json({ error: 'Không tìm thấy thông báo.' }, { status: 404 });
  return Response.json({ ok: true });
});
