import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { comments, posts, reportReasonEnum, reports, users } from "../db/schema";

export class ReportError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ReportError";
  }
}

const targetId = z.number({ error: "Mã nội dung phải là một số nguyên dương." })
  .int({ error: "Mã nội dung phải là một số nguyên dương." })
  .positive({ error: "Mã nội dung phải là một số nguyên dương." })
  .max(Number.MAX_SAFE_INTEGER, { error: "Mã nội dung không hợp lệ." });

const reportInputSchema = z.object({
  postId: targetId.optional(),
  commentId: targetId.optional(),
  reason: z.enum(reportReasonEnum.enumValues, { error: "Vui lòng chọn lý do báo cáo hợp lệ." }),
  description: z.string({ error: "Ghi chú phải là văn bản." })
    .max(1000, { error: "Ghi chú không được vượt quá 1000 ký tự." })
    .trim()
    .default(""),
}).strict().refine(
  (input) => (input.postId !== undefined) !== (input.commentId !== undefined),
  { message: "Chọn chính xác một bài viết hoặc bình luận để báo cáo." },
);

/** reporterId must come from server auth, never from the request body. */
export async function createReport(reporterId: number, body: unknown) {
  if (!Number.isSafeInteger(reporterId) || reporterId <= 0) {
    throw new ReportError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để báo cáo nội dung.");
  }

  const parsed = reportInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ReportError(
      400,
      "INVALID_REPORT",
      issue?.code === "unrecognized_keys" ? "Thông tin báo cáo có trường không hợp lệ." : issue.message,
    );
  }
  const input = parsed.data;

  return db.transaction(async (tx) => {
    const [reporter] = await tx.select({ role: users.role, isVerified: users.isVerified })
      .from(users)
      .where(eq(users.id, reporterId))
      .for("share")
      .limit(1);

    if (!reporter) {
      throw new ReportError(401, "UNAUTHENTICATED", "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.");
    }
    if (reporter.role !== "student" || !reporter.isVerified) {
      throw new ReportError(403, "FORBIDDEN", "Bạn cần xác thực sinh viên để báo cáo nội dung.");
    }

    // Shared row locks keep the target active/existing until the insert commits.
    // A comment is publicly available only while its parent post is active too.
    let target: { id: number } | undefined;
    if (input.postId !== undefined) {
      [target] = await tx.select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.id, input.postId), eq(posts.status, "active")))
        .for("share")
        .limit(1);
    } else {
      const [reference] = await tx.select({ postId: comments.postId }).from(comments)
        .where(eq(comments.id, input.commentId!)).limit(1);
      if (reference) {
        // Match Admin and comment mutations: lock the parent post before the comment.
        const [parent] = await tx.select({ id: posts.id }).from(posts)
          .where(and(eq(posts.id, reference.postId), eq(posts.status, "active")))
          .for("share").limit(1);
        if (parent) {
          [target] = await tx.select({ id: comments.id }).from(comments)
            .where(and(eq(comments.id, input.commentId!), eq(comments.postId, parent.id), eq(comments.status, "active")))
            .for("share").limit(1);
        }
      }
    }

    if (!target) {
      throw new ReportError(404, "TARGET_UNAVAILABLE", "Nội dung đã bị gỡ hoặc không còn tồn tại.");
    }

    const [report] = await tx.insert(reports).values({
      reporterId,
      postId: input.postId ?? null,
      commentId: input.commentId ?? null,
      reason: input.reason,
      description: input.description,
      status: "pending",
    })
      // The DB unique indexes arbitrate duplicate requests, including concurrent ones.
      .onConflictDoNothing()
      .returning({ id: reports.id, createdAt: reports.createdAt });

    if (!report) {
      throw new ReportError(409, "DUPLICATE_REPORT", "Bạn đã báo cáo nội dung này rồi.");
    }

    return { ...report, status: "pending" as const };
  });
}
