import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), requireStudent: vi.fn() }));
vi.mock("../server/db/client", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("../server/reports/auth", () => ({ requireReportStudent: mocks.requireStudent }));

import { POST } from "../app/api/reports/route";
import { createReport, ReportError } from "../server/reports/service";

let selectResults: object[][];
const createdAt = new Date("2026-11-08T02:00:00Z");
const insert = { values: vi.fn(), onConflictDoNothing: vi.fn(), returning: vi.fn() };
const tx = {
  select: vi.fn(() => {
    const rows = selectResults.shift() ?? [];
    const query = {
      from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), for: vi.fn(), limit: vi.fn(),
    };
    query.from.mockReturnValue(query);
    query.innerJoin.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.for.mockReturnValue(query);
    query.limit.mockResolvedValue(rows);
    return query;
  }),
  insert: vi.fn(() => insert),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_URL", "http://localhost:3000");
  selectResults = [[{ role: "student", isVerified: true }], [{ id: 42 }]];
  insert.values.mockReturnValue(insert);
  insert.onConflictDoNothing.mockReturnValue(insert);
  insert.returning.mockResolvedValue([{ id: 100, createdAt }]);
  mocks.transaction.mockImplementation((callback: (connection: typeof tx) => Promise<unknown>) => callback(tx));
  mocks.requireStudent.mockResolvedValue({ id: 17 });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("createReport", () => {
  it("creates a pending post report using the server-session id", async () => {
    await expect(createReport(17, { postId: 42, reason: "spam", description: "  Ghi chú  " }))
      .resolves.toEqual({ id: 100, createdAt, status: "pending" });
    expect(insert.values).toHaveBeenCalledWith({
      reporterId: 17, postId: 42, commentId: null, reason: "spam", description: "Ghi chú", status: "pending",
    });
    expect(insert.onConflictDoNothing).toHaveBeenCalledOnce();
  });

  it("creates a comment report without setting a post target", async () => {
    await createReport(17, { commentId: 7, reason: "abuse" });
    expect(insert.values).toHaveBeenCalledWith(expect.objectContaining({
      postId: null, commentId: 7, description: "", reason: "abuse",
    }));
    expect(tx.select.mock.results[1].value.innerJoin).toHaveBeenCalledOnce();
  });

  it.each(["spam", "abuse", "misinformation", "other"])("accepts the schema reason %s", async (reason) => {
    await expect(createReport(17, { postId: 42, reason })).resolves.toHaveProperty("status", "pending");
  });

  it.each([
    null,
    {},
    { reason: "spam" },
    { postId: 42, commentId: 7, reason: "spam" },
    { postId: 0, reason: "spam" },
    { postId: -1, reason: "spam" },
    { postId: 1.5, reason: "spam" },
    { postId: Number.MAX_SAFE_INTEGER + 1, reason: "spam" },
    { commentId: "7", reason: "spam" },
    { postId: 42, reason: "invalid" },
    { postId: 42, reason: "spam", description: "x".repeat(1001) },
    { postId: 42, reason: "spam", description: null },
    { postId: 42, reason: "spam", reporterId: 999 },
    { postId: 42, reason: "spam", status: "resolved_remove" },
  ])("rejects invalid or client-controlled fields before accessing the DB: %j", async (input) => {
    await expect(createReport(17, input)).rejects.toMatchObject({ status: 400, code: "INVALID_REPORT" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("accepts a note at the 1000-character boundary", async () => {
    await expect(createReport(17, { postId: 42, reason: "other", description: "x".repeat(1000) }))
      .resolves.toHaveProperty("id", 100);
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid server user ids: %s", async (id) => {
    await expect(createReport(id, { postId: 42, reason: "spam" })).rejects.toMatchObject({ status: 401 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a session whose user no longer exists", async () => {
    selectResults = [[]];
    await expect(createReport(17, { postId: 42, reason: "spam" })).rejects.toMatchObject({ status: 401 });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it.each([
    { role: "guest", isVerified: false },
    { role: "guest", isVerified: true },
    { role: "student", isVerified: false },
    { role: "admin", isVerified: true },
  ])("checks current student permission in the DB: %j", async (reporter) => {
    selectResults = [[reporter]];
    await expect(createReport(17, { postId: 42, reason: "spam" })).rejects.toMatchObject({ status: 403 });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it.each([{ postId: 42 }, { commentId: 7 }])("rejects unavailable targets: %j", async (target) => {
    selectResults = [[{ role: "student", isVerified: true }], []];
    await expect(createReport(17, { ...target, reason: "spam" })).rejects.toMatchObject({
      status: 404, code: "TARGET_UNAVAILABLE",
    });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("returns 409 when the DB uniqueness constraint rejects a duplicate", async () => {
    insert.returning.mockResolvedValue([]);
    await expect(createReport(17, { postId: 42, reason: "spam" })).rejects.toMatchObject({
      status: 409, code: "DUPLICATE_REPORT",
    });
  });

  it("propagates DB failures instead of returning false success", async () => {
    insert.returning.mockRejectedValue(new Error("database failure"));
    await expect(createReport(17, { postId: 42, reason: "spam" })).rejects.toThrow("database failure");
  });
});

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/reports", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reports", () => {
  it("returns a receipt without exposing reporter details", async () => {
    const response = await POST(request({ postId: 42, reason: "spam" }));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      report: { id: 100, status: "pending", createdAt: createdAt.toISOString() },
      message: "Đã gửi báo cáo. Cảm ơn bạn đã hỗ trợ cộng đồng.",
    });
  });

  it.each(["https://other.example", "null", ""])("rejects an invalid/missing Origin: %s", async (origin) => {
    const response = await POST(request({ postId: 42, reason: "spam" }, { origin }));
    expect(response.status).toBe(403);
    expect(mocks.requireStudent).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("uses the configured APP_URL origin", async () => {
    vi.stubEnv("APP_URL", "https://sivi.example");
    expect((await POST(request({ postId: 42, reason: "spam" }))).status).toBe(403);
  });

  it("rejects non-JSON submissions before auth or DB calls", async () => {
    const response = await POST(request({}, { "content-type": "text/plain" }));
    expect(response.status).toBe(415);
    expect(mocks.requireStudent).not.toHaveBeenCalled();
  });

  it("reports malformed JSON", async () => {
    const response = await POST(new Request("http://localhost:3000/api/reports", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: "{invalid",
    }));
    expect(response.status).toBe(400);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it.each([401, 403, 503])("preserves the auth failure status %s and does not write", async (status) => {
    mocks.requireStudent.mockRejectedValue(new ReportError(status, "AUTH_ERROR", "Không đủ quyền."));
    const response = await POST(request({ postId: 42, reason: "spam" }));
    expect(response.status).toBe(status);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a spoofed reporter id in the request body", async () => {
    const response = await POST(request({ postId: 42, reason: "spam", reporterId: 999 }));
    expect(response.status).toBe(400);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("returns the duplicate-report message to the form", async () => {
    insert.returning.mockResolvedValue([]);
    const response = await POST(request({ commentId: 7, reason: "abuse" }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "DUPLICATE_REPORT", error: "Bạn đã báo cáo nội dung này rồi." });
  });

  it("does not disclose DB error details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    insert.returning.mockRejectedValue(new Error("SQL and private report text"));
    const response = await POST(request({ postId: 42, reason: "spam" }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("SQL and private");
    expect(JSON.stringify(log.mock.calls)).not.toContain("SQL and private");
  });
});

describe("pending auth integration", () => {
  it("fails closed until Đạt connects the real student guard", async () => {
    const auth = await vi.importActual<typeof import("../server/reports/auth")>("../server/reports/auth");
    await expect(auth.requireReportStudent()).rejects.toMatchObject({ status: 503, code: "AUTH_NOT_READY" });
  });
});
