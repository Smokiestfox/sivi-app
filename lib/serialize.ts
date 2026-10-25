import type { QueryResultRow } from 'pg';

export type DbPost = QueryResultRow & {
  post_type: 'roommate' | 'review';
  id: string;
  user_id: string;
  author_name?: string;
  author_avatar?: string | null;
  user_vote?: number | null;
};

export function serializePost(row: DbPost) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.post_type,
    status: row.status,
    title: row.title,
    content: row.content,
    images: row.images,
    tags: row.tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    commentCount: row.comment_count,
    reportCount: row.report_count,
    author: row.author_name
      ? { name: row.author_name, avatar: row.author_avatar }
      : undefined,
    currentUserVote: row.user_vote ?? null,
    ...(row.post_type === 'roommate'
      ? {
          price: row.price,
          area: row.area,
          district: row.district,
          roomType: row.room_type,
          peopleNeeded: row.people_needed,
          amenities: row.amenities,
          genderPreference: row.gender_preference,
          contactInfo: row.contact_info,
        }
      : {
          placeName: row.place_name,
          placeAddress: row.place_address,
          placeType: row.place_type,
          rating: row.rating,
          priceRange: row.price_range,
          wifiRating: row.wifi_rating,
          atmosphereRating: row.atmosphere_rating,
          serviceRating: row.service_rating,
        }),
  };
}

export function serializeComment(row: Record<string, unknown>) {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    author: row.author_name,
    avatar: row.author_avatar,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
