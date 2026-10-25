import { randomUUID } from 'node:crypto';
import { requireStudent } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { boundedString, HttpError, readJson, requireSameOrigin } from '@/lib/http';
import { moderate, rejectFlagged } from '@/lib/moderation';
import { route } from '@/lib/route';
import { serializeComment } from '@/lib/serialize';

export const GET = route(async (_request, { params }) => {
  const { id } = await params;
  const post = await query<{ id: string; status: string }>('SELECT id, status FROM posts WHERE id=$1', [id]);
  if (!post.rows[0] || post.rows[0].status !== 'active') {
    throw new HttpError(404, 'Không tìm thấy bài đăng.');
  }
  const comments = await query(
    `SELECT c.*, u.name AS author_name, u.avatar AS author_avatar
     FROM comments c JOIN users u ON u.id=c.user_id
     WHERE c.post_id=$1 AND c.status='active' ORDER BY c.created_at`,
    [id],
  );
  return Response.json({ comments: comments.rows.map((row) => serializeComment(row)) });
});

export const POST = route(async (request, { params }) => {
  requireSameOrigin(request);
  const user = await requireStudent();
  const { id: postId } = await params;
  const body = await readJson(request);
  const content = boundedString(body.content, 'Bình luận', 2000);
  const availablePost = await query<{ id: string }>(
    "SELECT id FROM posts WHERE id=$1 AND status='active'",
    [postId],
  );
  if (!availablePost.rows[0]) throw new HttpError(404, 'Bài đăng không còn khả dụng.');
  const moderation = await moderate(content, 'comment');
  rejectFlagged(moderation);

  const commentId = randomUUID();
  const result = await transaction(async (client) => {
    const post = await client.query<{ id: string }>(
      "SELECT id FROM posts WHERE id=$1 AND status='active' FOR UPDATE",
      [postId],
    );
    if (!post.rows[0]) throw new HttpError(404, 'Bài đăng không còn khả dụng.');
    const comment = await client.query(
      `INSERT INTO comments (id, post_id, user_id, content, moderation_result)
       VALUES ($1,$2,$3,$4,$5::jsonb)
       RETURNING *`,
      [commentId, postId, user.id, content, JSON.stringify(moderation)],
    );
    await client.query('UPDATE posts SET comment_count=comment_count+1 WHERE id=$1', [postId]);
    return comment;
  });
  return Response.json(
    { comment: serializeComment({ ...result.rows[0], author_name: user.name, author_avatar: user.avatar }) },
    { status: 201 },
  );
});
