import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { moderationLogs, postImages, posts, reviewPosts, roommatePosts } from "../db/schema";
import type { ForumActor, ForumDependencies, ForumTransaction, StoredImage } from "../forum/contracts";
import { ForumError } from "../forum/errors";
import { approve, requireStudent } from "../forum/mutation";
import { moderationText, type PostPayload } from "./payload";
import { getPost } from "./read";

export { getPost, listOwnPosts, listPosts } from "./read";
export type { FeedOptions, PostDto } from "./read";

function activePost(id: number) {
  return and(eq(posts.id, id), eq(posts.status, "active"));
}

function selectTarget(reader: typeof db | ForumTransaction, id: number) {
  return reader.select({
    id: posts.id,
    authorId: posts.authorId,
    type: posts.postType,
    revision: sql<string>`xmin::text`,
  }).from(posts).where(activePost(id));
}

export async function lockActivePost(tx: ForumTransaction, id: number) {
  const [post] = await selectTarget(tx, id).for("update");
  if (!post) throw new ForumError("NOT_FOUND", "Bài đăng không còn hiển thị.");
  return post;
}

function assertOwner(post: { authorId: number } | undefined, actor: ForumActor) {
  if (!post) throw new ForumError("NOT_FOUND", "Bài đăng không còn hiển thị.");
  if (post.authorId !== actor.id) {
    throw new ForumError("FORBIDDEN", "Chỉ tác giả được sửa hoặc xóa bài.");
  }
}

function commonFields(payload: PostPayload) {
  return {
    title: payload.title,
    content: payload.content,
    address: payload.address ?? null,
    googleMapsUrl: payload.googleMapsUrl ?? null,
  };
}

async function writeSubtype(tx: ForumTransaction, id: number, payload: PostPayload) {
  if (payload.type === "roommate") {
    const fields = {
      rent: String(payload.rent),
      peopleNeeded: payload.peopleNeeded,
      genderPreference: payload.genderPreference,
      areaM2: payload.areaM2 == null ? null : String(payload.areaM2),
      roommateRequirements: payload.roommateRequirements ?? null,
      roomType: payload.roomType,
      district: payload.district ?? null,
      amenities: payload.amenities,
      contactInfo: payload.contactInfo ?? null,
    };
    await tx.insert(roommatePosts).values({ postId: id, ...fields })
      .onConflictDoUpdate({ target: roommatePosts.postId, set: { ...fields, updatedAt: new Date() } });
  } else {
    const fields = {
      placeName: payload.placeName,
      placeType: payload.placeType,
      referencePrice: payload.referencePrice == null ? null : String(payload.referencePrice),
      rating: payload.rating,
      experience: payload.experience ?? null,
      priceRange: payload.priceRange,
      wifiRating: payload.wifiRating ?? null,
      atmosphereRating: payload.atmosphereRating ?? null,
      serviceRating: payload.serviceRating ?? null,
    };
    await tx.insert(reviewPosts).values({ postId: id, ...fields })
      .onConflictDoUpdate({ target: reviewPosts.postId, set: { ...fields, updatedAt: new Date() } });
  }
}

async function writeImages(tx: ForumTransaction, id: number, images: StoredImage[], start: number) {
  if (images.length) {
    await tx.insert(postImages).values(images.map((image, i) => ({
      ...image, postId: id, sortOrder: start + i,
    })));
  }
}

async function removeFiles(deps: ForumDependencies, keys: string[]) {
  const results = await Promise.allSettled(keys.map(async (key) => deps.removeImage(key)));
  if (results.some((result) => result.status === "rejected")) {
    console.error("Could not remove one or more unreferenced forum images");
  }
}

async function removeAfterRollback(deps: ForumDependencies, keys: string[]) {
  if (!keys.length) return;
  try {
    // If the connection failed during commit, keep any file now referenced by the database.
    const referenced = await db.select({ key: postImages.storageKey })
      .from(postImages).where(inArray(postImages.storageKey, keys));
    const used = new Set(referenced.map(({ key }) => key));
    await removeFiles(deps, keys.filter((key) => !used.has(key)));
  } catch {
    console.error("Could not verify whether staged forum images are still referenced");
  }
}

async function withImages<T>(
  deps: ForumDependencies,
  files: File[],
  moderate: (images: StoredImage[]) => ReturnType<typeof approve>,
  write: (images: StoredImage[], log: Awaited<ReturnType<typeof approve>>) => Promise<T>,
) {
  const images: StoredImage[] = [];
  let log: Awaited<ReturnType<typeof approve>>;
  try {
    for (const file of files) images.push(await deps.saveImage(file));
    log = await moderate(images);
  } catch (error) {
    await removeFiles(deps, images.map(({ storageKey }) => storageKey));
    throw error;
  }

  try {
    return await write(images, log);
  } catch (error) {
    await removeAfterRollback(deps, images.map(({ storageKey }) => storageKey));
    throw error;
  }
}

async function writtenPost(tx: ForumTransaction, id: number, viewerId: number) {
  const post = await getPost(id, viewerId, tx);
  if (!post) throw new Error("Written post is missing");
  return post;
}

async function approvePost(deps: ForumDependencies, payload: PostPayload, images: StoredImage[], postId?: number) {
  const describe = deps.describeImage;
  const imageDescriptions = describe && images.length ? await Promise.all(images.map(describe)) : undefined;
  return approve(deps, {
    contentType: "post",
    ...(postId === undefined ? {} : { postId }),
    ...moderationText(payload),
    ...(imageDescriptions ? { imageDescriptions } : {}),
  });
}

export async function createPost(deps: ForumDependencies, actor: ForumActor, payload: PostPayload, files: File[]) {
  requireStudent(actor);
  return withImages(deps, files, (images) => approvePost(deps, payload, images),
    (images, log) => db.transaction(async (tx) => {
      const [{ id }] = await tx.insert(posts).values({
        ...commonFields(payload), postType: payload.type, authorId: actor.id,
      }).returning({ id: posts.id });
      await writeSubtype(tx, id, payload);
      await writeImages(tx, id, images, 0);
      await tx.insert(moderationLogs).values({ ...log, contentType: "post", postId: id });
      return writtenPost(tx, id, actor.id);
    }));
}

export async function updatePost(
  deps: ForumDependencies,
  actor: ForumActor,
  id: number,
  payload: PostPayload,
  files: File[],
  keepImageIds: number[],
) {
  requireStudent(actor);
  const [before] = await selectTarget(db, id);
  assertOwner(before, actor);
  if (before.type !== payload.type) {
    throw new ForumError("VALIDATION_ERROR", "Không thể đổi loại bài.");
  }
  const { post, removedKeys } = await withImages(deps, files, (images) => approvePost(deps, payload, images, id),
    (images, log) => db.transaction(async (tx) => {
      const locked = await lockActivePost(tx, id);
      assertOwner(locked, actor);
      if (locked.revision !== before.revision) {
        throw new ForumError("CONFLICT", "Bài đăng đã thay đổi. Hãy tải lại trước khi sửa.");
      }

      const existing = await tx.select().from(postImages).where(eq(postImages.postId, id))
        .orderBy(asc(postImages.sortOrder));
      const keep = new Set(keepImageIds);
      const retained = existing.filter((image) => keep.has(image.id));
      if (retained.length !== keep.size) {
        throw new ForumError("VALIDATION_ERROR", "Có ảnh giữ lại không thuộc bài đăng.");
      }

      const removed = existing.filter((image) => !keep.has(image.id));
      if (removed.length) {
        await tx.delete(postImages).where(inArray(postImages.id, removed.map((image) => image.id)));
      }
      // Close gaps from left to right after deleting dropped rows, without colliding with the unique order.
      for (const [sortOrder, image] of retained.entries()) {
        if (image.sortOrder !== sortOrder) {
          await tx.update(postImages).set({ sortOrder }).where(eq(postImages.id, image.id));
        }
      }
      await tx.update(posts).set({ ...commonFields(payload), updatedAt: new Date() }).where(eq(posts.id, id));
      await writeSubtype(tx, id, payload);
      await writeImages(tx, id, images, retained.length);
      await tx.insert(moderationLogs).values({ ...log, contentType: "post", postId: id });
      return { post: await writtenPost(tx, id, actor.id), removedKeys: removed.map((image) => image.storageKey) };
    }));

  await removeFiles(deps, removedKeys);
  return post;
}

export async function deletePost(deps: ForumDependencies, actor: ForumActor, id: number) {
  requireStudent(actor);
  const removedKeys = await db.transaction(async (tx) => {
    assertOwner(await lockActivePost(tx, id), actor);
    const images = await tx.select({ key: postImages.storageKey }).from(postImages).where(eq(postImages.postId, id));
    await tx.delete(posts).where(eq(posts.id, id));
    return images.map(({ key }) => key);
  });

  await removeFiles(deps, removedKeys);
}
