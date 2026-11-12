import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn(), transaction: vi.fn(), revalidate: vi.fn(), currentUser: vi.fn() }));
vi.mock("../server/db/client", () => ({ db: { select: mocks.select, transaction: mocks.transaction } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("../server/auth/current-user", () => ({ getCurrentUser: mocks.currentUser }));

import * as admin from "../server/admin/service";
import { POST } from "../app/api/admin/reports/[id]/route";

let reads: object[][];
let writes: object[][];
const updates: { table: unknown; values?: unknown }[] = [];
function query(rows: object[]) {
  const chain = Object.assign(Promise.resolve(rows), {
    from: vi.fn(), where: vi.fn(), innerJoin: vi.fn(), leftJoin: vi.fn(),
    orderBy: vi.fn(), for: vi.fn(), limit: vi.fn(), set: vi.fn(), returning: vi.fn(),
  });
  for (const method of ["from", "where", "innerJoin", "leftJoin", "orderBy", "for", "limit", "set", "returning"] as const) chain[method].mockReturnValue(chain);
  return chain;
}
const tx = {
  select: mocks.select,
  update: vi.fn((table: unknown) => {
    const update: { table: unknown; values?: unknown } = { table };
    updates.push(update);
    const chain = query(writes.shift() ?? []);
    chain.set.mockImplementation((values: unknown) => { update.values = values; return chain; });
    return chain;
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_URL", "http://localhost:3000");
  mocks.currentUser.mockResolvedValue(null);
  reads = [[{ role: "admin" }], [{ postId: 42, commentId: null }], [{ status: "active" }], [{ id: 10, status: "pending" }, { id: 11, status: "pending" }]];
  writes = [[{ id: 10 }, { id: 11 }]];
  updates.length = 0;
  mocks.select.mockImplementation(() => query(reads.shift() ?? []));
  mocks.transaction.mockImplementation((callback: (connection: typeof tx) => unknown) => callback(tx));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("resolveReportCluster", () => {
  it("keeps the target and resolves all pending reports with the admin audit fields", async () => {
    const result = await admin.resolveReportCluster(3, 10, { decision: "keep", note: "  Hợp lệ  " });
    expect(result).toMatchObject({ decision: "keep", processedCount: 2, targetType: "post", targetId: 42, postId: 42 });
    expect(updates).toHaveLength(1);
    expect(updates[0].values).toMatchObject({ status: "resolved_keep", resolvedBy: 3, resolutionNote: "Hợp lệ", resolvedAt: expect.any(Date) });
  });

  it("hides a post and resolves its cluster inside the same transaction", async () => {
    writes = [[], [{ id: 10 }, { id: 11 }]];
    const result = await admin.resolveReportCluster(3, 10, { decision: "remove" });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(result.processedCount).toBe(2);
    expect(updates.map((update) => update.values)).toEqual([
      { status: "hidden", updatedAt: expect.any(Date) },
      { status: "resolved_remove", resolvedBy: 3, resolutionNote: null, resolvedAt: expect.any(Date) },
    ]);
  });

  it("locks the parent post, hides only the comment, and returns the parent path id", async () => {
    reads = [[{ role: "admin" }], [{ postId: null, commentId: 7 }], [{ postId: 42 }], [{ status: "active" }], [{ status: "active" }], [{ id: 10, status: "pending" }]];
    writes = [[], [{ id: 10 }]];
    await expect(admin.resolveReportCluster(3, 10, { decision: "remove" })).resolves.toMatchObject({ targetType: "comment", targetId: 7, postId: 42 });
    expect(updates).toHaveLength(2);
  });

  it.each([null, {}, { decision: "invalid" }, { decision: "keep", adminId: 999 }, { decision: "remove", note: "x".repeat(1001) }])("rejects invalid payloads: %j", async (input) => {
    await expect(admin.resolveReportCluster(3, 10, input)).rejects.toMatchObject({ status: 400 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects invalid report id %s", async (id) => {
    await expect(admin.resolveReportCluster(3, id, { decision: "keep" })).rejects.toMatchObject({ status: 400 });
  });
  it.each(["guest", "student"])("blocks %s at the service boundary", async (role) => {
    reads = [[{ role }]];
    await expect(admin.resolveReportCluster(3, 10, { decision: "keep" })).rejects.toMatchObject({ status: 403 });
    expect(tx.update).not.toHaveBeenCalled();
  });
  it("blocks an invalid or deleted session user", async () => {
    await expect(admin.resolveReportCluster(0, 10, { decision: "keep" })).rejects.toMatchObject({ status: 401 });
    reads = [[]];
    await expect(admin.resolveReportCluster(3, 10, { decision: "keep" })).rejects.toMatchObject({ status: 401 });
    expect(tx.update).not.toHaveBeenCalled();
  });
  it("does not overwrite a decision made by another admin", async () => {
    reads[3] = [{ id: 10, status: "resolved_keep" }];
    await expect(admin.resolveReportCluster(3, 10, { decision: "remove" })).rejects.toMatchObject({ status: 409, code: "ALREADY_RESOLVED" });
    expect(tx.update).not.toHaveBeenCalled();
  });
  it("does not restore already hidden content with keep", async () => {
    reads[2] = [{ status: "hidden" }];
    await expect(admin.resolveReportCluster(3, 10, { decision: "keep" })).rejects.toMatchObject({ status: 409, code: "TARGET_HIDDEN" });
    expect(tx.update).not.toHaveBeenCalled();
  });
  it("can close pending reports for already hidden content with remove", async () => {
    reads[2] = [{ status: "hidden" }]; writes = [[], [{ id: 10 }]];
    await expect(admin.resolveReportCluster(3, 10, { decision: "remove" })).resolves.toMatchObject({ processedCount: 1 });
  });
  it.each([1, 2])("does not write when the reference or target disappeared (read %s)", async (index) => {
    reads[index] = [];
    await expect(admin.resolveReportCluster(3, 10, { decision: "remove" })).rejects.toMatchObject({ status: 404 });
    expect(tx.update).not.toHaveBeenCalled();
  });
});

const at = new Date("2026-11-08T02:00:00Z");
function reportRow(id: number, extra: object = {}) {
  return {
    id, reason: "spam", description: "Lặp nội dung", createdAt: at, status: "pending", reporterName: "Sinh viên",
    resolvedAt: null, resolutionNote: null, resolverName: null,
    targetPostId: 42, targetCommentId: null, postId: 42, postType: "review", postTitle: "Review", postContent: "Nội dung",
    postStatus: "active", postOwnerName: "Tác giả", commentContent: null, commentStatus: null, commentOwnerName: null,
    totalCount: 3, ...extra,
  };
}
describe("listReportQueue", () => {
  it("groups reports by target and attaches only the latest moderation result", async () => {
    reads = [[{ role: "admin" }], [reportRow(11), reportRow(10)], [
      { postId: 42, commentId: null, result: "approved", needsReview: true, reason: "Cần xem", modelVersion: "latest", policyVersion: "v1", scannedAt: at },
      { postId: 42, commentId: null, result: "approved", needsReview: false, reason: null, modelVersion: "old", policyVersion: "v1", scannedAt: at },
    ]];
    const items = await admin.listReportQueue(3);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ key: "post-42", reportId: 11, totalCount: 3, moderation: { modelVersion: "latest", needsReview: true } });
    expect(items[0].reports).toHaveLength(2);
    expect(items[0].reports[0].createdAt).toBe(at.toISOString());
  });
  it("keeps post and comment targets separate even when numeric ids match", async () => {
    reads = [[{ role: "admin" }], [reportRow(11), reportRow(12, { targetPostId: null, targetCommentId: 42, commentContent: "Bình luận", commentStatus: "active", commentOwnerName: "Bình" })], []];
    const items = await admin.listReportQueue(3);
    expect(items.map((item) => item.key)).toEqual(["post-42", "comment-42"]);
    expect(items[1].target.authorName).toBe("Bình");
  });
  it("does not load moderation for an empty queue", async () => {
    reads = [[{ role: "admin" }], []];
    await expect(admin.listReportQueue(3)).resolves.toEqual([]);
    expect(mocks.select).toHaveBeenCalledTimes(2);
  });
  it.each(["guest", "student"])("does not expose reports to %s", async (role) => {
    reads = [[{ role }]];
    await expect(admin.listReportQueue(3)).rejects.toMatchObject({ status: 403 });
    expect(mocks.select).toHaveBeenCalledOnce();
  });
  it("preserves processed decisions and notes", async () => {
    reads = [[{ role: "admin" }], [reportRow(11, { status: "resolved_remove", resolvedAt: at, resolverName: "Admin", resolutionNote: "Vi phạm" })], []];
    const items = await admin.listReportQueue(3, "processed");
    expect(items[0].reports[0]).toMatchObject({ status: "resolved_remove", resolverName: "Admin", resolutionNote: "Vi phạm" });
  });
});

const context = (id = "10") => ({ params: Promise.resolve({ id }) });
function request(body: unknown = { decision: "keep" }, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/admin/reports/10", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}
describe("admin route and auth handoff", () => {
  it("requires a real session before opening the admin route", async () => {
    expect((await POST(request(), context())).status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("uses the session admin id and invalidates admin/public pages", async () => {
    vi.spyOn(admin, "requireAdmin").mockResolvedValue({ id: 3 });
    const response = await POST(request(), context());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ processedCount: 2, decision: "keep" });
    expect(mocks.revalidate.mock.calls.map(([path]) => path)).toEqual(["/admin", "/", "/review", "/profile", "/posts/42"]);
  });
  it.each([401, 403])("preserves auth failure status %s", async (status) => {
    vi.spyOn(admin, "requireAdmin").mockRejectedValue(new admin.AdminError(status, "AUTH_ERROR", "Không đủ quyền."));
    expect((await POST(request(), context())).status).toBe(status);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each(["https://other.test", "null", ""])("rejects invalid/missing Origin %s", async (origin) => {
    const guard = vi.spyOn(admin, "requireAdmin");
    expect((await POST(request({}, { origin }), context())).status).toBe(403);
    expect(guard).not.toHaveBeenCalled();
  });
  it("rejects non-JSON requests", async () => {
    expect((await POST(request({}, { "content-type": "text/plain" }), context())).status).toBe(415);
  });
  it.each(["0", "-1", "1.2", "1e2", "9007199254740992"])("rejects invalid path id %s", async (id) => {
    vi.spyOn(admin, "requireAdmin").mockResolvedValue({ id: 3 });
    expect((await POST(request(), context(id))).status).toBe(400);
  });
  it("returns conflicts and avoids revalidation on rejected decisions", async () => {
    vi.spyOn(admin, "requireAdmin").mockResolvedValue({ id: 3 });
    reads[3] = [{ id: 10, status: "resolved_remove" }];
    expect((await POST(request(), context())).status).toBe(409);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("keeps a committed decision successful if cache invalidation fails", async () => {
    vi.spyOn(admin, "requireAdmin").mockResolvedValue({ id: 3 });
    mocks.revalidate.mockImplementationOnce(() => { throw new Error("cache unavailable"); });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await POST(request(), context())).status).toBe(200);
  });
  it("sanitizes unexpected DB errors", async () => {
    vi.spyOn(admin, "requireAdmin").mockResolvedValue({ id: 3 });
    mocks.transaction.mockRejectedValueOnce(new Error("private SQL report text"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(request(), context());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private SQL");
    expect(JSON.stringify(log.mock.calls)).not.toContain("private SQL");
  });
});
