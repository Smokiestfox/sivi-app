import { and, asc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { comments, moderationLogs, posts, users } from "../db/schema";
import type { ForumActor, ForumDependencies, ForumReader } from "../forum/contracts";
import { ForumError } from "../forum/errors";
import { approve, positiveId, requireStudent, validate } from "../forum/mutation";
import { publicAuthor } from "../posts/read";
import { lockActivePost } from "../posts/service";

export const commentPayload = z.strictObject({ content: z.string().trim().min(1).max(2_000) });

const commentPage = z.object({
  cursor: positiveId.optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const selection = {
  id: comments.id,
  postId: comments.postId,
  content: comments.content,
  author: publicAuthor,
  createdAt: comments.createdAt,
  updatedAt: comments.updatedAt,
};

function dto(row: {
  id: number; postId: number; content: string;
  author: { id: number; name: string; avatarUrl: string | null };
  createdAt: Date; updatedAt: Date;
}) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export type CommentDto = ReturnType<typeof dto>;

async function selectPage(scope: ReturnType<typeof eq>, options: z.input<typeof commentPage>) {
  const { limit, cursor } = validate(commentPage, options);
  const rows = await db.select(selection).from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(and(scope, eq(comments.status, "active"), eq(posts.status, "active"),
      cursor === undefined ? undefined : gt(comments.id, cursor)))
    .orderBy(asc(comments.id)).limit(limit + 1);
  const items = rows.slice(0, limit).map(dto);
  return { items, nextCursor: rows.length > limit ? items[items.length - 1].id : null };
}

export function listComments(postId: number, options: z.input<typeof commentPage> = {}) {
  return selectPage(eq(comments.postId, postId), options);
}

export function listOwnComments(authorId: number, options: z.input<typeof commentPage> = {}) {
  return selectPage(eq(comments.authorId, authorId), options);
}

async function findTarget(reader: ForumReader, id: number) {
  const [comment] = await reader.select({
    postId: comments.postId,
    authorId: comments.authorId,
    revision: sql<string>`"comments".xmin::text`,
  }).from(comments).innerJoin(posts, eq(posts.id, comments.postId))
    .where(and(eq(comments.id, id), eq(comments.status, "active"), eq(posts.status, "active")));
  return comment;
}

function assertOwner(comment: { authorId: number } | undefined, actor: ForumActor) {
  if (!comment) throw new ForumError("NOT_FOUND", "Bình luận không còn hiển thị.");
  if (comment.authorId !== actor.id) {
    throw new ForumError("FORBIDDEN", "Chỉ tác giả được sửa hoặc xóa bình luận.");
  }
}

async function writtenComment(reader: ForumReader, id: number) {
  const [comment] = await reader.select(selection).from(comments)
    .innerJoin(users, eq(comments.authorId, users.id)).where(eq(comments.id, id));
  if (!comment) throw new Error("Written comment is missing");
  return dto(comment);
}

export async function createComment(deps: ForumDependencies, actor: ForumActor, postId: number, content: string) {
  requireStudent(actor);
  const [target] = await db.select({ id: posts.id }).from(posts)
    .where(and(eq(posts.id, postId), eq(posts.status, "active")));
  if (!target) throw new ForumError("NOT_FOUND", "Bài đăng không còn hiển thị.");

  const log = await approve(deps, { contentType: "comment", postId, title: "", body: content });
  return db.transaction(async (tx) => {
    await lockActivePost(tx, postId);
    const [{ id }] = await tx.insert(comments).values({ postId, authorId: actor.id, content })
      .returning({ id: comments.id });
    await tx.insert(moderationLogs).values({ ...log, contentType: "comment", commentId: id });
    return writtenComment(tx, id);
  });
}

export async function updateComment(deps: ForumDependencies, actor: ForumActor, id: number, content: string) {
  requireStudent(actor);
  const before = await findTarget(db, id);
  assertOwner(before, actor);
  const log = await approve(deps, {
    contentType: "comment", postId: before.postId, commentId: id, title: "", body: content,
  });

  return db.transaction(async (tx) => {
    await lockActivePost(tx, before.postId);
    const [current] = await tx.select({
      authorId: comments.authorId,
      revision: sql<string>`xmin::text`,
    }).from(comments).where(and(eq(comments.id, id), eq(comments.status, "active"))).for("update");
    assertOwner(current, actor);
    if (current.revision !== before.revision) {
      throw new ForumError("CONFLICT", "Bình luận đã thay đổi. Hãy tải lại trước khi sửa.");
    }

    await tx.update(comments).set({ content, updatedAt: new Date() }).where(eq(comments.id, id));
    await tx.insert(moderationLogs).values({ ...log, contentType: "comment", commentId: id });
    return writtenComment(tx, id);
  });
}

export async function deleteComment(actor: ForumActor, id: number) {
  requireStudent(actor);
  const before = await findTarget(db, id);
  assertOwner(before, actor);
  await db.transaction(async (tx) => {
    await lockActivePost(tx, before.postId);
    const [deleted] = await tx.delete(comments)
      .where(and(eq(comments.id, id), eq(comments.authorId, actor.id), eq(comments.status, "active")))
      .returning({ id: comments.id });
    if (!deleted) throw new ForumError("NOT_FOUND", "Bình luận không còn hiển thị.");
  });
}
