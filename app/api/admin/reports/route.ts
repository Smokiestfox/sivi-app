import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { route } from '@/lib/route';

export const GET = route(async () => {
  await requireAdmin();
  const result = await query(
    `SELECT r.id, r.reason, r.description, r.status, r.created_at,
            reporter.name AS reporter_name,
            p.id AS post_id, p.post_type, p.title AS post_title, p.status AS post_status,
            p.content AS post_content, p.moderation_result AS post_moderation,
            post_owner.name AS post_owner_name,
            c.id AS comment_id, c.content AS comment_content,
            c.moderation_result AS comment_moderation, c_owner.name AS comment_owner_name,
            (SELECT count(*)::integer FROM reports other
              WHERE other.status='pending' AND (
                (r.post_id IS NOT NULL AND other.post_id=r.post_id)
                OR (r.comment_id IS NOT NULL AND other.comment_id=r.comment_id)
              )) AS pending_report_count
     FROM reports r
     JOIN users reporter ON reporter.id=r.reporter_id
     LEFT JOIN posts p ON p.id=r.post_id
     LEFT JOIN users post_owner ON post_owner.id=p.user_id
     LEFT JOIN comments c ON c.id=r.comment_id
     LEFT JOIN users c_owner ON c_owner.id=c.user_id
     WHERE r.status='pending' ORDER BY r.created_at ASC`,
  );
  return Response.json({ reports: result.rows });
});
