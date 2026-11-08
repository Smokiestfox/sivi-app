import { and, asc, desc, eq, inArray, lte, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { comments, postImages, posts, reviewPosts, roommatePosts, users, votes } from "../db/schema";
import type { ForumReader } from "../forum/contracts";
import { validate, positiveId } from "../forum/mutation";
import { z } from "zod";

export const publicAuthor = {
  id: users.id,
  name: users.name,
  avatarUrl: users.avatarUrl,
};

const pageSchema = z.object({
  cursor: positiveId.optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const feedSchema = pageSchema.extend({
  type: z.enum(["roommate", "review"]),
  q: z.string().trim().max(200).optional(),
  district: z.string().trim().max(100).optional(),
  maxPrice: z.number().nonnegative().optional(),
  viewerId: positiveId.optional(),
});

export type FeedOptions = z.input<typeof feedSchema>;

async function selectPosts(reader: ForumReader, where: SQL, limit: number, viewerId?: number) {
  const rows = await reader.select({
    id: posts.id,
    type: posts.postType,
    status: posts.status,
    title: posts.title,
    content: posts.content,
    address: posts.address,
    googleMapsUrl: posts.googleMapsUrl,
    createdAt: posts.createdAt,
    updatedAt: posts.updatedAt,
    author: publicAuthor,
    roommate: {
      rent: roommatePosts.rent,
      peopleNeeded: roommatePosts.peopleNeeded,
      genderPreference: roommatePosts.genderPreference,
      areaM2: roommatePosts.areaM2,
      roommateRequirements: roommatePosts.roommateRequirements,
      roomType: roommatePosts.roomType,
      district: roommatePosts.district,
      amenities: roommatePosts.amenities,
      contactInfo: roommatePosts.contactInfo,
    },
    review: {
      placeName: reviewPosts.placeName,
      placeType: reviewPosts.placeType,
      referencePrice: reviewPosts.referencePrice,
      rating: reviewPosts.rating,
      experience: reviewPosts.experience,
      priceRange: reviewPosts.priceRange,
      wifiRating: reviewPosts.wifiRating,
      atmosphereRating: reviewPosts.atmosphereRating,
      serviceRating: reviewPosts.serviceRating,
    },
    counts: {
      comments: sql<number>`(select count(*)::int from ${comments}
        where ${comments.postId} = ${posts.id} and ${comments.status} = 'active')`,
      upvotes: sql<number>`(select count(*)::int from ${votes} where ${votes.postId} = ${posts.id} and ${votes.value} = 1)`,
      downvotes: sql<number>`(select count(*)::int from ${votes} where ${votes.postId} = ${posts.id} and ${votes.value} = -1)`,
    },
    currentUserVote: viewerId === undefined
      ? sql<null>`null`
      : sql<1 | -1 | null>`(select ${votes.value} from ${votes} where ${votes.postId} = ${posts.id} and ${votes.userId} = ${viewerId})`,
  }).from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .leftJoin(roommatePosts, eq(roommatePosts.postId, posts.id))
    .leftJoin(reviewPosts, eq(reviewPosts.postId, posts.id))
    .where(where).orderBy(desc(posts.id)).limit(limit);

  if (rows.length === 0) return [];

  const images = await reader.select({
    id: postImages.id,
    postId: postImages.postId,
    url: postImages.url,
    altText: postImages.altText,
    width: postImages.width,
    height: postImages.height,
  }).from(postImages).where(inArray(postImages.postId, rows.map((row) => row.id)))
    .orderBy(asc(postImages.sortOrder));
  const imagesByPost = new Map<number, Omit<(typeof images)[number], "postId">[]>();
  for (const { postId, ...image } of images) {
    const list = imagesByPost.get(postId) ?? [];
    list.push(image);
    imagesByPost.set(postId, list);
  }

  return rows.map(({ type, roommate, review, createdAt, updatedAt, ...row }) => {
    const common = {
      ...row,
      images: imagesByPost.get(row.id) ?? [],
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
    if (type === "roommate" && roommate) {
      return {
        ...common,
        type,
        ...roommate,
        rent: Number(roommate.rent),
        areaM2: roommate.areaM2 === null ? null : Number(roommate.areaM2),
      };
    }
    if (type === "review" && review) {
      return {
        ...common,
        type,
        ...review,
        referencePrice: review.referencePrice === null ? null : Number(review.referencePrice),
      };
    }
    throw new Error("Post subtype is missing");
  });
}

export type PostDto = Awaited<ReturnType<typeof selectPosts>>[number];

export async function getPost(id: number, viewerId?: number, reader: ForumReader = db) {
  const [post] = await selectPosts(reader, and(eq(posts.id, id), eq(posts.status, "active"))!, 1, viewerId);
  return post ?? null;
}

export async function listPosts(options: FeedOptions) {
  const { type, cursor, limit, viewerId, q, district, maxPrice } = validate(feedSchema, options);
  const escapedSearch = q?.replace(/[\\%_]/g, "\\$&");
  const search = "%" + escapedSearch + "%";
  const rows = await selectPosts(db, and(
    eq(posts.status, "active"),
    eq(posts.postType, type),
    cursor === undefined ? undefined : lt(posts.id, cursor),
    q ? or(
      sql`${posts.title} ilike ${search}`,
      sql`${posts.content} ilike ${search}`,
      sql`${posts.address} ilike ${search}`,
      sql`${reviewPosts.placeName} ilike ${search}`,
    ) : undefined,
    type === "roommate" && district ? eq(roommatePosts.district, district) : undefined,
    type === "roommate" && maxPrice !== undefined ? lte(roommatePosts.rent, String(maxPrice)) : undefined,
  )!, limit + 1, viewerId);
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? items[items.length - 1].id : null };
}

export async function listOwnPosts(authorId: number, options: z.input<typeof pageSchema> = {}) {
  const { limit, cursor } = validate(pageSchema, options);
  const rows = await selectPosts(db, and(
    eq(posts.authorId, authorId),
    eq(posts.status, "active"),
    cursor === undefined ? undefined : lt(posts.id, cursor),
  )!, limit + 1, authorId);
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? items[items.length - 1].id : null };
}
