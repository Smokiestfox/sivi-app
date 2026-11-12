import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "../db/client";
import { comments, moderationLogs, posts, reports, users } from "../db/schema";
import { getCurrentUser } from "../auth/current-user";

export class AdminError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "AdminError";
  }
}

export async function requireAdmin(): Promise<{ id: number }> {
  const user = await getCurrentUser();
  if (!user) throw new AdminError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
  if (user.role !== "admin") {
    throw new AdminError(403, "FORBIDDEN", "Bạn cần quyền quản trị để xử lý báo cáo.");
  }
  return { id: user.id };
}

type Reader = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
export type QueueStatus = "pending" | "processed";
export type AdminDecision = "keep" | "remove";

export interface AdminReportItem {
  id: number;
  reason: "spam" | "abuse" | "misinformation" | "other";
  description: string;
  reporterName: string;
  createdAt: string;
  status: "pending" | "resolved_keep" | "resolved_remove";
  resolvedAt: string | null;
  resolverName: string | null;
  resolutionNote: string | null;
}

export interface ReportQueueItem {
  key: string;
  reportId: number;
  target: {
    type: "post" | "comment";
    id: number;
    postId: number | null;
    postType: "roommate" | "review" | null;
    title: string | null;
    content: string;
    authorName: string;
    status: "active" | "hidden" | null;
    parentStatus: "active" | "hidden" | null;
  };
  totalCount: number;
  reports: AdminReportItem[];
  moderation: {
    result: "approved" | "rejected";
    needsReview: boolean;
    reason: string | null;
    modelVersion: string;
    policyVersion: string;
    scannedAt: string;
  } | null;
}

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}

async function assertAdmin(reader: Reader, adminId: number, lock = false) {
  if (!validId(adminId)) throw new AdminError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
  const query = reader.select({ role: users.role }).from(users).where(eq(users.id, adminId));
  const [admin] = await (lock ? query.for("share") : query).limit(1);
  if (!admin) throw new AdminError(401, "UNAUTHENTICATED", "Phiên đăng nhập không còn hợp lệ.");
  if (admin.role !== "admin") throw new AdminError(403, "FORBIDDEN", "Bạn cần quyền quản trị để xử lý báo cáo.");
}

/** Protected server read; never expose the returned queue before checking the session. */
export async function listReportQueue(adminId: number, status: QueueStatus = "pending"): Promise<ReportQueueItem[]> {
  await assertAdmin(db, adminId);
  if (status !== "pending" && status !== "processed") {
    throw new AdminError(400, "INVALID_STATUS", "Trạng thái báo cáo không hợp lệ.");
  }
  const postOwner = alias(users, "reported_post_owner");
  const commentOwner = alias(users, "reported_comment_owner");
  const resolver = alias(users, "report_resolver");
  const rows = await db.select({
    id: reports.id, reason: reports.reason, description: reports.description,
    createdAt: reports.createdAt, status: reports.status, reporterName: users.name,
    resolvedAt: reports.resolvedAt, resolutionNote: reports.resolutionNote, resolverName: resolver.name,
    targetPostId: reports.postId, targetCommentId: reports.commentId,
    postId: posts.id, postType: posts.postType, postTitle: posts.title,
    postContent: posts.content, postStatus: posts.status, postOwnerName: postOwner.name,
    commentContent: comments.content, commentStatus: comments.status, commentOwnerName: commentOwner.name,
    totalCount: sql<number>`(select count(*)::int from reports as target_reports
      where target_reports.post_id = ${reports.postId} or target_reports.comment_id = ${reports.commentId})`,
  }).from(reports)
    .innerJoin(users, eq(users.id, reports.reporterId))
    .leftJoin(comments, eq(comments.id, reports.commentId))
    .leftJoin(posts, eq(posts.id, sql<number>`coalesce(${reports.postId}, ${comments.postId})`))
    .leftJoin(postOwner, eq(postOwner.id, posts.authorId))
    .leftJoin(commentOwner, eq(commentOwner.id, comments.authorId))
    .leftJoin(resolver, eq(resolver.id, reports.resolvedBy))
    .where(status === "pending" ? eq(reports.status, "pending") : ne(reports.status, "pending"))
    .orderBy(desc(reports.createdAt), desc(reports.id));

  const groups = new Map<string, ReportQueueItem>();
  for (const row of rows) {
    const commentTarget = row.targetCommentId !== null;
    const id = (commentTarget ? row.targetCommentId : row.targetPostId)!;
    const key = `${commentTarget ? "comment" : "post"}-${id}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key, reportId: row.id, totalCount: Number(row.totalCount), reports: [], moderation: null,
        target: {
          type: commentTarget ? "comment" : "post", id, postId: row.postId,
          postType: row.postType, title: row.postTitle,
          content: (commentTarget ? row.commentContent : row.postContent) ?? "Nội dung không còn tồn tại.",
          authorName: (commentTarget ? row.commentOwnerName : row.postOwnerName) ?? "Không xác định",
          status: commentTarget ? row.commentStatus : row.postStatus, parentStatus: row.postStatus,
        },
      };
      groups.set(key, group);
    }
    group.reports.push({
      id: row.id, reason: row.reason, description: row.description, reporterName: row.reporterName,
      createdAt: row.createdAt.toISOString(), status: row.status,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      resolverName: row.resolverName, resolutionNote: row.resolutionNote,
    });
  }
  const items = [...groups.values()];
  if (items.length === 0) return items;

  const postIds = items.filter((item) => item.target.type === "post").map((item) => item.target.id);
  const commentIds = items.filter((item) => item.target.type === "comment").map((item) => item.target.id);
  const logs = await db.select({
    postId: moderationLogs.postId, commentId: moderationLogs.commentId,
    result: moderationLogs.result, needsReview: moderationLogs.needsReview, reason: moderationLogs.reason,
    modelVersion: moderationLogs.modelVersion, policyVersion: moderationLogs.policyVersion,
    scannedAt: moderationLogs.scannedAt,
  }).from(moderationLogs).where(or(
    postIds.length ? and(eq(moderationLogs.contentType, "post"), inArray(moderationLogs.postId, postIds)) : undefined,
    commentIds.length ? and(eq(moderationLogs.contentType, "comment"), inArray(moderationLogs.commentId, commentIds)) : undefined,
  )).orderBy(desc(moderationLogs.scannedAt), desc(moderationLogs.id));
  for (const log of logs) {
    const key = log.commentId !== null ? `comment-${log.commentId}` : `post-${log.postId}`;
    const group = groups.get(key);
    if (group && !group.moderation) {
      group.moderation = {
        result: log.result, needsReview: log.needsReview, reason: log.reason,
        modelVersion: log.modelVersion, policyVersion: log.policyVersion,
        scannedAt: log.scannedAt.toISOString(),
      };
    }
  }
  return items;
}

const decisionSchema = z.object({
  decision: z.enum(["keep", "remove"], { error: "Vui lòng chọn giữ hoặc gỡ nội dung." }),
  note: z.string({ error: "Ghi chú phải là văn bản." })
    .max(1000, { error: "Ghi chú không được vượt quá 1000 ký tự." }).trim().default(""),
}).strict();

/** Resolves all pending reports for the selected target in one transaction. */
export async function resolveReportCluster(adminId: number, reportId: number, body: unknown) {
  if (!validId(reportId)) throw new AdminError(400, "INVALID_ID", "Mã báo cáo không hợp lệ.");
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    throw new AdminError(400, "INVALID_DECISION", "Quyết định không hợp lệ. Chọn giữ/gỡ và ghi chú tối đa 1000 ký tự.");
  }
  const { decision, note } = parsed.data;

  return db.transaction(async (tx) => {
    await assertAdmin(tx, adminId, true);
    // Discover without locking a report first. Creation also locks the target before
    // touching reports, so keep the same lock order to avoid target/report deadlocks.
    const [reference] = await tx.select({ postId: reports.postId, commentId: reports.commentId })
      .from(reports).where(eq(reports.id, reportId)).limit(1);
    if (!reference) throw new AdminError(404, "REPORT_NOT_FOUND", "Báo cáo không còn tồn tại. Vui lòng tải lại.");

    const commentTarget = reference.commentId !== null;
    let postId = reference.postId;
    if (commentTarget) {
      const [comment] = await tx.select({ postId: comments.postId }).from(comments)
        .where(eq(comments.id, reference.commentId!)).limit(1);
      postId = comment?.postId ?? null;
    }
    if (postId === null) throw new AdminError(404, "TARGET_NOT_FOUND", "Nội dung đã bị xóa. Vui lòng tải lại.");
    const [post] = await tx.select({ status: posts.status }).from(posts)
      .where(eq(posts.id, postId)).for("update").limit(1);
    if (!post) throw new AdminError(404, "TARGET_NOT_FOUND", "Nội dung đã bị xóa. Vui lòng tải lại.");

    let targetStatus = post.status;
    if (commentTarget) {
      const [comment] = await tx.select({ status: comments.status }).from(comments)
        .where(and(eq(comments.id, reference.commentId!), eq(comments.postId, postId)))
        .for("update").limit(1);
      if (!comment) throw new AdminError(404, "TARGET_NOT_FOUND", "Bình luận đã bị xóa. Vui lòng tải lại.");
      targetStatus = comment.status;
    }
    const scope = commentTarget ? eq(reports.commentId, reference.commentId!) : eq(reports.postId, postId);
    const cluster = await tx.select({ id: reports.id, status: reports.status }).from(reports)
      .where(scope).orderBy(asc(reports.id)).for("update");
    const selected = cluster.find((report) => report.id === reportId);
    if (!selected) throw new AdminError(404, "REPORT_NOT_FOUND", "Báo cáo không còn tồn tại. Vui lòng tải lại.");
    if (selected.status !== "pending") {
      throw new AdminError(409, "ALREADY_RESOLVED", "Báo cáo đã được quản trị viên khác xử lý. Vui lòng tải lại.");
    }
    if (decision === "keep" && (targetStatus !== "active" || post.status !== "active")) {
      throw new AdminError(409, "TARGET_HIDDEN", "Nội dung đã bị ẩn. Chọn gỡ để đóng các báo cáo còn chờ.");
    }

    const now = new Date();
    if (decision === "remove") {
      const table = commentTarget ? comments : posts;
      const id = commentTarget ? reference.commentId! : postId;
      await tx.update(table).set({ status: "hidden", updatedAt: now }).where(eq(table.id, id));
    }
    const processed = await tx.update(reports).set({
      status: decision === "keep" ? "resolved_keep" : "resolved_remove",
      resolvedBy: adminId, resolvedAt: now, resolutionNote: note || null,
    }).where(and(scope, eq(reports.status, "pending"))).returning({ id: reports.id });
    if (processed.length === 0) {
      throw new AdminError(409, "ALREADY_RESOLVED", "Báo cáo đã được xử lý. Vui lòng tải lại.");
    }
    return {
      decision, processedCount: processed.length, postId,
      targetType: commentTarget ? "comment" as const : "post" as const,
      targetId: commentTarget ? reference.commentId! : postId, resolvedAt: now.toISOString(),
    };
  });
}
