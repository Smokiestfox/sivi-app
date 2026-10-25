import { requireStudent } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { boundedString, HttpError, readJson, requireSameOrigin } from '@/lib/http';
import { moderate, rejectFlagged } from '@/lib/moderation';
import { route } from '@/lib/route';

export const PATCH = route(async (request, { params }) => {
  requireSameOrigin(request);
  const user = await requireStudent();
  const { id } = await params;
  const content = boundedString((await readJson(request)).content, 'Bình luận', 2000);
  const comment = await query<{ user_id: string }>('SELECT user_id FROM comments WHERE id=$1', [id]);
  if (!comment.rows[0]) throw new HttpError(404, 'Không tìm thấy bình luận.');
  if (comment.rows[0].user_id !== user.id) throw new HttpError(403, 'Bạn chỉ có thể sửa bình luận của mình.');
  const moderation = await moderate(content, 'comment');
  rejectFlagged(moderation);
  const updated = await query(
    `UPDATE comments SET content=$2, moderation_result=$3::jsonb, updated_at=now()
     WHERE id=$1 AND user_id=$4 RETURNING id`,
    [id, content, JSON.stringify(moderation), user.id],
  );
  if (!updated.rows[0]) throw new HttpError(404, 'Bình luận không còn khả dụng.');
  return Response.json({ message: 'Đã cập nhật bình luận.' });
});

export const DELETE = route(async (request, { params }) => {
  requireSameOrigin(request);
  const user = await requireStudent();
  const { id } = await params;
  await transaction(async (client) => {
    const comment = await client.query<{ post_id: string; user_id: string }>(
      'SELECT post_id, user_id FROM comments WHERE id=$1 FOR UPDATE',
      [id],
    );
    if (!comment.rows[0]) throw new HttpError(404, 'Không tìm thấy bình luận.');
    if (comment.rows[0].user_id !== user.id) {
      throw new HttpError(403, 'Bạn chỉ có thể xóa bình luận của mình.');
    }
    await client.query('DELETE FROM comments WHERE id=$1', [id]);
    await client.query(
      'UPDATE posts SET comment_count=GREATEST(comment_count-1, 0) WHERE id=$1',
      [comment.rows[0].post_id],
    );
  });
  return Response.json({ ok: true });
});
