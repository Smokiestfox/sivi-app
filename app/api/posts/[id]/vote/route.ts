import { requireStudent } from '@/lib/auth';
import { transaction } from '@/lib/db';
import { HttpError, readJson, requireSameOrigin } from '@/lib/http';
import { route } from '@/lib/route';

export const POST = route(async (request, { params }) => {
  requireSameOrigin(request);
  const user = await requireStudent();
  const { id: postId } = await params;
  const body = await readJson(request);
  if (body.value !== 1 && body.value !== -1) throw new HttpError(400, 'Lựa chọn vote không hợp lệ.');

  const result = await transaction(async (client) => {
    const post = await client.query<{ post_type: string }>(
      "SELECT post_type FROM posts WHERE id=$1 AND status='active' FOR UPDATE",
      [postId],
    );
    if (!post.rows[0]) throw new HttpError(404, 'Bài đăng không còn khả dụng.');
    if (post.rows[0].post_type !== 'review') {
      throw new HttpError(400, 'Chỉ bài review địa điểm mới hỗ trợ vote.');
    }

    const current = await client.query<{ value: number }>(
      'SELECT value FROM votes WHERE user_id=$1 AND post_id=$2',
      [user.id, postId],
    );
    let userVote: number | null = Number(body.value);
    if (current.rows[0]?.value === body.value) {
      await client.query('DELETE FROM votes WHERE user_id=$1 AND post_id=$2', [user.id, postId]);
      await client.query(
        `UPDATE posts SET
         upvotes=upvotes-CASE WHEN $2=1 THEN 1 ELSE 0 END,
         downvotes=downvotes-CASE WHEN $2=-1 THEN 1 ELSE 0 END
         WHERE id=$1`,
        [postId, body.value],
      );
      userVote = null;
    } else {
      await client.query(
        `INSERT INTO votes (user_id, post_id, value) VALUES ($1,$2,$3)
         ON CONFLICT (user_id, post_id) DO UPDATE SET value=EXCLUDED.value, created_at=now()`,
        [user.id, postId, body.value],
      );
      await client.query(
        `UPDATE posts SET
         upvotes=upvotes
           - CASE WHEN $2::integer=1 THEN 0 ELSE CASE WHEN $3::integer=1 THEN 1 ELSE 0 END END
           + CASE WHEN $2::integer=1 THEN 1 ELSE 0 END,
         downvotes=downvotes
           - CASE WHEN $2::integer=-1 THEN 0 ELSE CASE WHEN $3::integer=-1 THEN 1 ELSE 0 END END
           + CASE WHEN $2::integer=-1 THEN 1 ELSE 0 END
         WHERE id=$1`,
        [postId, body.value, current.rows[0]?.value ?? 0],
      );
    }
    const counts = await client.query<{ upvotes: number; downvotes: number }>(
      'SELECT upvotes, downvotes FROM posts WHERE id=$1',
      [postId],
    );
    return { ...counts.rows[0], userVote };
  });
  return Response.json(result);
});
