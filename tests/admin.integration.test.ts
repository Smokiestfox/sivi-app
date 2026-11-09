import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { listReportQueue, resolveReportCluster } from "../server/admin/service";
import { createReport } from "../server/reports/service";
import { comments, posts, reports, reviewPosts, users } from "../server/db/schema";
import { listComments } from "../server/comments/service";
import { getPost } from "../server/posts/service";
import { actors, forumDatabase, hasTestDatabase, testDb, testPool } from "./fixtures/forum";

vi.mock("../server/db/client", async () => ({ db: (await import("./fixtures/forum")).testDb }));

describe.skipIf(!hasTestDatabase)("Admin transactions on PostgreSQL", () => {
  forumDatabase();
  let adminId: number;
  let postId: number;
  let reportId: number;
  let otherReportId: number;

  beforeEach(async () => {
    const [admin] = await testDb.insert(users).values({ googleId: "admin", email: "admin@example.test", name: "Admin", role: "admin" }).returning({ id: users.id });
    adminId = admin.id;
    const [post] = await testDb.insert(posts).values({ authorId: actors.student.id, postType: "review", title: "Quán thử", content: "Nội dung thử" }).returning({ id: posts.id });
    postId = post.id;
    await testDb.insert(reviewPosts).values({ postId, placeName: "Cafe", placeType: "cafe", rating: 4, priceRange: "low" });
    reportId = (await createReport(actors.student.id, { postId, reason: "spam" })).id;
    otherReportId = (await createReport(actors.other.id, { postId, reason: "misinformation" })).id;
  });

  it("groups real reports and moves the whole cluster to history on keep", async () => {
    const pending = await listReportQueue(adminId);
    expect(pending).toHaveLength(1);
    expect(pending[0].reports).toHaveLength(2);
    await expect(resolveReportCluster(adminId, reportId, { decision: "keep", note: "Đã kiểm tra" })).resolves.toMatchObject({ processedCount: 2 });
    expect(await listReportQueue(adminId)).toEqual([]);
    const history = await listReportQueue(adminId, "processed");
    expect(history[0].reports.every((row) => row.status === "resolved_keep" && row.resolutionNote === "Đã kiểm tra")).toBe(true);
    expect(await getPost(postId)).not.toBeNull();
  });

  it("hides a post from the real public reader and records both report decisions", async () => {
    await resolveReportCluster(adminId, reportId, { decision: "remove" });
    expect(await getPost(postId)).toBeNull();
    const rows = await testDb.select().from(reports);
    expect(rows.every((row) => row.status === "resolved_remove" && row.resolvedBy === adminId && row.resolvedAt !== null)).toBe(true);
    await expect(createReport(actors.student.id, { postId, reason: "abuse" })).rejects.toMatchObject({ status: 404 });
  });

  it("hides a comment without hiding its parent post", async () => {
    const [comment] = await testDb.insert(comments).values({ postId, authorId: actors.student.id, content: "Bình luận thử" }).returning({ id: comments.id });
    const report = await createReport(actors.other.id, { commentId: comment.id, reason: "abuse" });
    await resolveReportCluster(adminId, report.id, { decision: "remove" });
    expect((await listComments(postId)).items).toEqual([]);
    expect(await getPost(postId)).not.toBeNull();
    expect((await listReportQueue(adminId))).toHaveLength(1); // The post report cluster is independent.
  });

  it("allows only one concurrent decision on the same target", async () => {
    const results = await Promise.allSettled([
      resolveReportCluster(adminId, reportId, { decision: "keep" }),
      resolveReportCluster(adminId, otherReportId, { decision: "remove" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409, code: "ALREADY_RESOLVED" });
    const rows = await testDb.select().from(reports);
    expect(new Set(rows.map((row) => row.status)).size).toBe(1);
  });

  it("serializes new comment reports against removal without leaving pending reports", async () => {
    const [comment] = await testDb.insert(comments).values({ postId, authorId: actors.student.id, content: "Bình luận thử" }).returning({ id: comments.id });
    const initial = await createReport(actors.student.id, { commentId: comment.id, reason: "spam" });
    const [resolution, creation] = await Promise.allSettled([
      resolveReportCluster(adminId, initial.id, { decision: "remove" }),
      createReport(actors.other.id, { commentId: comment.id, reason: "abuse" }),
    ]);
    expect(resolution.status).toBe("fulfilled");
    if (creation.status === "rejected") expect(creation.reason).toMatchObject({ status: 404 });
    const rows = await testDb.select().from(reports).where(eq(reports.commentId, comment.id));
    expect(rows.every((row) => row.status === "resolved_remove")).toBe(true);
  });

  it("rolls back the target hide when updating the report cluster fails", async () => {
    await testPool.query(`create function reject_admin_resolution() returns trigger language plpgsql as $$
      begin if NEW.status <> 'pending' then raise exception 'fixture rejection'; end if; return NEW; end; $$;
      create trigger reject_admin_resolution before update on reports for each row execute function reject_admin_resolution();`);
    try {
      await expect(resolveReportCluster(adminId, reportId, { decision: "remove" })).rejects.toThrow();
      const [post] = await testDb.select({ status: posts.status }).from(posts).where(eq(posts.id, postId));
      expect(post.status).toBe("active");
      const rows = await testDb.select().from(reports);
      expect(rows.every((row) => row.status === "pending" && row.resolvedBy === null && row.resolvedAt === null)).toBe(true);
    } finally {
      await testPool.query("drop trigger reject_admin_resolution on reports; drop function reject_admin_resolution();");
    }
  });

  it("rejects a student for both reads and writes", async () => {
    await expect(listReportQueue(actors.student.id)).rejects.toMatchObject({ status: 403 });
    await expect(resolveReportCluster(actors.student.id, reportId, { decision: "remove" })).rejects.toMatchObject({ status: 403 });
    expect(await getPost(postId)).not.toBeNull();
  });
});
