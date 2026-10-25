import { randomUUID } from 'node:crypto';
import { currentUser, requireStudent } from '@/lib/auth';
import { query } from '@/lib/db';
import { rejectFlagged, moderate } from '@/lib/moderation';
import { serializePost, type DbPost } from '@/lib/serialize';
import { validatePost } from '@/lib/post-validation';
import { HttpError, readJson, requireSameOrigin } from '@/lib/http';
import { route } from '@/lib/route';
import type { PostType } from '@/types';

export const GET = route(async (request) => {
  const typeValue = new URL(request.url).searchParams.get('type');
  if (typeValue && typeValue !== 'roommate' && typeValue !== 'review') {
    throw new HttpError(400, 'Loại bài đăng không hợp lệ.');
  }
  const user = await currentUser();
  const result = await query<DbPost>(
    `SELECT p.*, u.name AS author_name, u.avatar AS author_avatar,
            v.value AS user_vote
     FROM posts p JOIN users u ON u.id = p.user_id
     LEFT JOIN votes v ON v.post_id = p.id AND v.user_id = $1
     WHERE p.status = 'active' AND ($2::text IS NULL OR p.post_type = $2)
     ORDER BY p.created_at DESC`,
    [user?.id ?? null, typeValue ?? null],
  );
  return Response.json({ posts: result.rows.map((row) => serializePost(row)) });
});

export const POST = route(async (request) => {
  requireSameOrigin(request);
  const user = await requireStudent();
  const body = await readJson(request);
  const type = body.type;
  if (type !== 'roommate' && type !== 'review') throw new HttpError(400, 'Loại bài đăng không hợp lệ.');
  const postType = type as PostType;
  const data = validatePost(body, postType);
  const moderation = await moderate(`${data.title}\n${data.content}`, 'post');
  rejectFlagged(moderation);

  const id = randomUUID();
  let result;
  if (data.type === 'roommate') {
    result = await query<DbPost>(
      `INSERT INTO posts (
        id, user_id, post_type, status, title, content, images, tags,
        price, area, district, room_type, people_needed, amenities,
        gender_preference, contact_info, moderation_result
      ) VALUES ($1,$2,'roommate','active',$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15::jsonb)
      RETURNING *`,
      [
        id, user.id, data.title, data.content, JSON.stringify(data.images), JSON.stringify(data.tags),
        data.price, data.area, data.district, data.roomType, data.peopleNeeded,
        JSON.stringify(data.amenities), data.genderPreference, data.contactInfo, JSON.stringify(moderation),
      ],
    );
  } else {
    result = await query<DbPost>(
      `INSERT INTO posts (
        id, user_id, post_type, status, title, content, images, tags,
        place_name, place_address, place_type, rating, price_range,
        wifi_rating, atmosphere_rating, service_rating, moderation_result
      ) VALUES ($1,$2,'review','active',$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
      RETURNING *`,
      [
        id, user.id, data.title, data.content, JSON.stringify(data.images), JSON.stringify(data.tags),
        data.placeName, data.placeAddress, data.placeType, data.rating, data.priceRange,
        data.wifiRating, data.atmosphereRating, data.serviceRating, JSON.stringify(moderation),
      ],
    );
  }
  return Response.json({ post: serializePost(result.rows[0]) }, { status: 201 });
});
