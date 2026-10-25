import { currentUser, requireStudent } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { HttpError, readJson, requireSameOrigin } from '@/lib/http';
import { rejectFlagged, moderate } from '@/lib/moderation';
import { validatePost } from '@/lib/post-validation';
import { route } from '@/lib/route';
import { serializePost, type DbPost } from '@/lib/serialize';

export const GET = route(async (request, { params }) => {
  const { id } = await params;
  const user = await currentUser();
  const result = await query<DbPost>(
    `SELECT p.*, u.name AS author_name, u.avatar AS author_avatar,
            v.value AS user_vote
     FROM posts p JOIN users u ON u.id = p.user_id
     LEFT JOIN votes v ON v.post_id = p.id AND v.user_id = $2
     WHERE p.id = $1 AND (p.status = 'active' OR p.user_id = $2 OR $3::boolean)`,
    [id, user?.id ?? null, user?.role === 'admin'],
  );
  if (!result.rows[0]) throw new HttpError(404, 'Không tìm thấy bài đăng.');
  return Response.json({ post: serializePost(result.rows[0]) });
});

export const PATCH = route(async (request, { params }) => {
  requireSameOrigin(request);
  const user = await requireStudent();
  const { id } = await params;
  const existing = await query<{ post_type: 'roommate' | 'review'; user_id: string }>(
    'SELECT post_type, user_id FROM posts WHERE id = $1',
    [id],
  );
  if (!existing.rows[0]) throw new HttpError(404, 'Không tìm thấy bài đăng.');
  if (existing.rows[0].user_id !== user.id) throw new HttpError(403, 'Bạn chỉ có thể sửa bài của mình.');
  const data = validatePost(await readJson(request), existing.rows[0].post_type);
  const moderation = await moderate(`${data.title}\n${data.content}`, 'post');
  rejectFlagged(moderation);

  const result = data.type === 'roommate'
    ? await query<DbPost>(
        `UPDATE posts SET
          title=$2, content=$3, images=$4::jsonb, tags=$5::jsonb,
          price=$6, area=$7, district=$8, room_type=$9, people_needed=$10,
          amenities=$11::jsonb, gender_preference=$12, contact_info=$13,
          place_name=NULL, place_address=NULL, place_type=NULL, rating=NULL,
          price_range=NULL, wifi_rating=NULL, atmosphere_rating=NULL, service_rating=NULL,
          moderation_result=$14::jsonb, updated_at=now()
         WHERE id=$1 RETURNING *`,
        [
          id, data.title, data.content, JSON.stringify(data.images), JSON.stringify(data.tags),
          data.price, data.area, data.district, data.roomType, data.peopleNeeded,
          JSON.stringify(data.amenities), data.genderPreference, data.contactInfo,
          JSON.stringify(moderation),
        ],
      )
    : await query<DbPost>(
        `UPDATE posts SET
          title=$2, content=$3, images=$4::jsonb, tags=$5::jsonb,
          place_name=$6, place_address=$7, place_type=$8, rating=$9, price_range=$10,
          wifi_rating=$11, atmosphere_rating=$12, service_rating=$13,
          price=NULL, area=NULL, district=NULL, room_type=NULL, people_needed=NULL,
          amenities='[]'::jsonb, gender_preference=NULL, contact_info=NULL,
          moderation_result=$14::jsonb, updated_at=now()
         WHERE id=$1 RETURNING *`,
        [
          id, data.title, data.content, JSON.stringify(data.images), JSON.stringify(data.tags),
          data.placeName, data.placeAddress, data.placeType, data.rating, data.priceRange,
          data.wifiRating, data.atmosphereRating, data.serviceRating, JSON.stringify(moderation),
        ],
      );
  return Response.json({ post: serializePost(result.rows[0]) });
});

export const DELETE = route(async (request, { params }) => {
  requireSameOrigin(request);
  const user = await requireStudent();
  const { id } = await params;
  await transaction(async (client) => {
    const post = await client.query<{ user_id: string }>('SELECT user_id FROM posts WHERE id=$1 FOR UPDATE', [id]);
    if (!post.rows[0]) throw new HttpError(404, 'Không tìm thấy bài đăng.');
    if (post.rows[0].user_id !== user.id) throw new HttpError(403, 'Bạn chỉ có thể xóa bài của mình.');
    await client.query('DELETE FROM posts WHERE id=$1', [id]);
  });
  return Response.json({ ok: true });
});
