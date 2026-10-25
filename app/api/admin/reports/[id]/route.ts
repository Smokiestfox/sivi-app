import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/auth';
import { transaction } from '@/lib/db';
import { boundedString, HttpError, readJson, requireSameOrigin } from '@/lib/http';
import { route } from '@/lib/route';

export const POST = route(async (request, { params }) => {
  requireSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await readJson(request);
  if (body.decision !== 'keep' && body.decision !== 'remove') {
    throw new HttpError(400, 'Kết quả xử lý báo cáo không hợp lệ.');
  }
  const note = body.decision === 'remove'
    ? boundedString(body.note, 'Lý do gỡ nội dung', 1000)
    : (typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '');

  await transaction(async (client) => {
    const reportResult = await client.query<{
      id: string; post_id: string | null; comment_id: string | null; status: string;
    }>('SELECT id, post_id, comment_id, status FROM reports WHERE id=$1 FOR UPDATE', [id]);
    const report = reportResult.rows[0];
    if (!report) throw new HttpError(404, 'Không tìm thấy báo cáo.');
    if (report.status !== 'pending') throw new HttpError(409, 'Báo cáo đã được xử lý.');

    let ownerId: string | undefined;
    if (report.post_id) {
      const post = await client.query<{ user_id: string }>(
        'SELECT user_id FROM posts WHERE id=$1 FOR UPDATE',
        [report.post_id],
      );
      ownerId = post.rows[0]?.user_id;
      if (body.decision === 'remove') {
        await client.query("UPDATE posts SET status='hidden', updated_at=now() WHERE id=$1", [report.post_id]);
      }
    } else if (report.comment_id) {
      const comment = await client.query<{ user_id: string }>(
        'SELECT user_id FROM comments WHERE id=$1 FOR UPDATE',
        [report.comment_id],
      );
      ownerId = comment.rows[0]?.user_id;
      if (body.decision === 'remove') {
        await client.query("UPDATE comments SET status='hidden', updated_at=now() WHERE id=$1", [report.comment_id]);
      }
    }

    await client.query(
      `UPDATE reports SET status=$2, resolved_by=$3, resolution_note=$4, resolved_at=now()
       WHERE id=$1`,
      [id, body.decision === 'keep' ? 'resolved_keep' : 'resolved_remove', admin.id, note],
    );
    if (ownerId && body.decision === 'remove') {
      await client.query(
        `INSERT INTO notifications (id, user_id, title, message, type)
         VALUES ($1,$2,$3,$4,'warning')`,
        [
          randomUUID(),
          ownerId,
          'Nội dung đã bị gỡ',
          `Nội dung của bạn đã bị ẩn bởi quản trị viên. Lý do: ${note}`,
        ],
      );
    }
  });
  return Response.json({ message: body.decision === 'remove' ? 'Đã gỡ nội dung.' : 'Đã giữ nội dung.' });
});
