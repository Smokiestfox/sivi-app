import { randomUUID } from 'node:crypto';
import { requireStudent } from '@/lib/auth';
import { transaction } from '@/lib/db';
import { boundedString, HttpError, readJson, requireSameOrigin } from '@/lib/http';
import { route } from '@/lib/route';

const reasons = ['spam', 'abuse', 'misinformation', 'other'];

export const POST = route(async (request) => {
  requireSameOrigin(request);
  const user = await requireStudent();
  const body = await readJson(request);
  const postId = typeof body.postId === 'string' ? body.postId : null;
  const commentId = typeof body.commentId === 'string' ? body.commentId : null;
  if ((postId === null) === (commentId === null)) {
    throw new HttpError(400, 'Chọn chính xác một bài viết hoặc bình luận để báo cáo.');
  }
  if (typeof body.reason !== 'string' || !reasons.includes(body.reason)) {
    throw new HttpError(400, 'Lý do báo cáo không hợp lệ.');
  }
  const description = body.description === undefined
    ? ''
    : boundedString(body.description, 'Ghi chú', 1000, false);
  const reportId = randomUUID();

  try {
    await transaction(async (client) => {
      if (postId) {
        const target = await client.query<{ id: string }>(
          "SELECT id FROM posts WHERE id=$1 AND status='active' FOR UPDATE",
          [postId],
        );
        if (!target.rows[0]) throw new HttpError(404, 'Bài đăng không còn khả dụng.');
      } else {
        const target = await client.query<{ id: string }>(
          `SELECT c.id FROM comments c JOIN posts p ON p.id=c.post_id
           WHERE c.id=$1 AND c.status='active' AND p.status='active'`,
          [commentId],
        );
        if (!target.rows[0]) throw new HttpError(404, 'Bình luận không còn khả dụng.');
      }

      await client.query(
        `INSERT INTO reports (id, post_id, comment_id, reporter_id, reason, description)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [reportId, postId, commentId, user.id, body.reason, description],
      );
      if (postId) await client.query('UPDATE posts SET report_count=report_count+1 WHERE id=$1', [postId]);
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new HttpError(409, 'Bạn đã báo cáo nội dung này rồi.');
    }
    throw error;
  }
  return Response.json({ message: 'Đã gửi báo cáo. Cảm ơn bạn đã hỗ trợ cộng đồng.' }, { status: 201 });
});
