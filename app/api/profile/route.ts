import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { route } from '@/lib/route';
import { serializeComment, serializePost, type DbPost } from '@/lib/serialize';

export const GET = route(async () => {
  const user = await requireUser();
  const [posts, comments] = await Promise.all([
    query<DbPost>(
      `SELECT p.*, u.name AS author_name, u.avatar AS author_avatar
       FROM posts p JOIN users u ON u.id=p.user_id
       WHERE p.user_id=$1 ORDER BY p.created_at DESC`,
      [user.id],
    ),
    query(
      `SELECT c.*, u.name AS author_name, u.avatar AS author_avatar, p.title AS post_title
       FROM comments c JOIN users u ON u.id=c.user_id
       JOIN posts p ON p.id=c.post_id
       WHERE c.user_id=$1 ORDER BY c.created_at DESC`,
      [user.id],
    ),
  ]);
  return Response.json({
    user,
    posts: posts.rows.map((row) => serializePost(row)),
    comments: comments.rows.map((row) => ({
      ...serializeComment(row),
      postTitle: row.post_title,
    })),
  });
});
