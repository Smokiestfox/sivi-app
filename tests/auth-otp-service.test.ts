import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { studentProfiles, users, verificationRequests } from "../server/db/schema";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  update: vi.fn(),
  prepareOtpEmail: vi.fn(),
  deliverEmail: vi.fn(),
}));

vi.mock("../server/db/client", () => ({ db: { transaction: mocks.transaction, update: mocks.update } }));
vi.mock("../server/auth/email", () => ({ prepareOtpEmail: mocks.prepareOtpEmail }));

let selectResults: object[][];
let inserted: { table: unknown; values: unknown }[];
let updates: { table: unknown; values: unknown }[];

const tx = {
  execute: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
};

function updater(table: unknown) {
  const query = {
    set: vi.fn((values: unknown) => {
      updates.push({ table, values });
      return query;
    }),
    where: vi.fn().mockResolvedValue([]),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("OTP_SECRET", "test-secret-that-is-at-least-32-bytes");
  vi.stubEnv("SMTP_URL", "smtp://localhost");
  vi.stubEnv("EMAIL_FROM", "SiVi <no-reply@example.com>");
  selectResults = [];
  inserted = [];
  updates = [];
  tx.execute.mockResolvedValue(undefined);
  tx.select.mockImplementation(() => {
    const rows = selectResults.shift() ?? [];
    const query = {
      from: vi.fn(), where: vi.fn(), orderBy: vi.fn(), for: vi.fn(), limit: vi.fn(),
    };
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.for.mockReturnValue(query);
    query.limit.mockResolvedValue(rows);
    return query;
  });
  tx.update.mockImplementation((table: unknown) => updater(table));
  tx.insert.mockImplementation((table: unknown) => {
    const query = {
      values: vi.fn((values: unknown) => {
        inserted.push({ table, values });
        return query;
      }),
      returning: vi.fn().mockResolvedValue([{ id: 88 }]),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };
    return query;
  });
  mocks.transaction.mockImplementation((callback: (connection: typeof tx) => Promise<unknown>) => callback(tx));
  mocks.update.mockImplementation((table: unknown) => updater(table));
  mocks.deliverEmail.mockResolvedValue(undefined);
  mocks.prepareOtpEmail.mockReturnValue(mocks.deliverEmail);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("requestOtp", () => {
  it("sends a six-digit OTP and stores only its keyed hash", async () => {
    selectResults = [
      [{ id: 7, role: "guest", isVerified: false }],
      [{ id: 23 }],
      [],
      [],
      [],
    ];
    const { requestOtp } = await vi.importActual<typeof import("../server/auth/service")>("../server/auth/service");

    await expect(requestOtp(7, { email: "  STUDENT@UIT.EDU.VN " })).resolves.toMatchObject({
      expiresInSeconds: 300,
    });

    const [email, otp] = mocks.prepareOtpEmail.mock.calls[0];
    expect(email).toBe("student@uit.edu.vn");
    expect(otp).toMatch(/^\d{6}$/);
    expect(mocks.deliverEmail).toHaveBeenCalledOnce();
    const requestInsert = inserted.find((entry) => entry.table === verificationRequests);
    expect(requestInsert?.values).toMatchObject({
      userId: 7,
      email,
      universityId: 23,
      attempts: 0,
      status: "pending",
    });
    expect((requestInsert?.values as { otpHash: string }).otpHash).not.toBe(otp);
  });

  it("rejects unsupported domains before inserting or sending", async () => {
    selectResults = [[{ id: 7, role: "guest", isVerified: false }], []];
    const { requestOtp } = await vi.importActual<typeof import("../server/auth/service")>("../server/auth/service");

    await expect(requestOtp(7, { email: "student@unsupported.example" }))
      .rejects.toMatchObject({ status: 400, code: "UNSUPPORTED_EMAIL_DOMAIN" });
    expect(tx.insert).not.toHaveBeenCalled();
    expect(mocks.deliverEmail).not.toHaveBeenCalled();
  });

  it("marks the pending request failed and reports SMTP delivery errors", async () => {
    selectResults = [
      [{ id: 7, role: "guest", isVerified: false }],
      [{ id: 23 }],
      [],
      [],
      [],
    ];
    mocks.deliverEmail.mockRejectedValue(new Error("SMTP unavailable"));
    const { requestOtp } = await vi.importActual<typeof import("../server/auth/service")>("../server/auth/service");

    await expect(requestOtp(7, { email: "student@uit.edu.vn" }))
      .rejects.toMatchObject({ status: 503, code: "EMAIL_DELIVERY_FAILED" });
    expect(mocks.update).toHaveBeenCalled();
    expect(updates).toContainEqual({ table: verificationRequests, values: { status: "failed" } });
  });
});

describe("verifyOtp", () => {
  it("promotes a guest and records the verified request atomically", async () => {
    const email = "student@uit.edu.vn";
    const otp = "012345";
    const secret = process.env.OTP_SECRET!;
    const otpHash = createHmac("sha256", secret).update(`7\0${email}\0${otp}`).digest("hex");
    selectResults = [
      [{ id: 7, role: "guest", isVerified: false }],
      [{
        id: 88,
        universityId: 23,
        otpHash,
        otpExpiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
        status: "pending",
      }],
      [{ id: 23 }],
      [],
    ];
    const { verifyOtp } = await vi.importActual<typeof import("../server/auth/service")>("../server/auth/service");

    await expect(verifyOtp(7, { email, otp })).resolves.toMatchObject({
      user: { id: 7, role: "student", isVerified: true },
    });
    expect(updates).toContainEqual({
      table: users,
      values: expect.objectContaining({
        universityEmail: email,
        universityId: 23,
        role: "student",
        isVerified: true,
      }),
    });
    expect(updates).toContainEqual({
      table: verificationRequests,
      values: expect.objectContaining({ status: "verified" }),
    });
    expect(inserted).toContainEqual({ table: studentProfiles, values: { userId: 7 } });
  });

  it("locks the OTP after the fifth incorrect attempt", async () => {
    selectResults = [
      [{ id: 7, role: "guest", isVerified: false }],
      [{
        id: 88,
        universityId: 23,
        otpHash: "0".repeat(64),
        otpExpiresAt: new Date(Date.now() + 60_000),
        attempts: 4,
        status: "pending",
      }],
    ];
    const { verifyOtp } = await vi.importActual<typeof import("../server/auth/service")>("../server/auth/service");

    await expect(verifyOtp(7, { email: "student@uit.edu.vn", otp: "123456" }))
      .rejects.toMatchObject({ status: 423, code: "OTP_LOCKED" });
    expect(updates).toContainEqual({
      table: verificationRequests,
      values: { attempts: 5, status: "locked" },
    });
    expect(tx.update).not.toHaveBeenCalledWith(users);
  });

  it("rejects expired OTPs and commits their expired status", async () => {
    selectResults = [
      [{ id: 7, role: "guest", isVerified: false }],
      [{
        id: 88,
        universityId: 23,
        otpHash: "0".repeat(64),
        otpExpiresAt: new Date(Date.now() - 1_000),
        attempts: 0,
        status: "pending",
      }],
    ];
    const { verifyOtp } = await vi.importActual<typeof import("../server/auth/service")>("../server/auth/service");

    await expect(verifyOtp(7, { email: "student@uit.edu.vn", otp: "123456" }))
      .rejects.toMatchObject({ status: 410, code: "OTP_EXPIRED" });
    expect(updates).toContainEqual({ table: verificationRequests, values: { status: "expired" } });
    expect(tx.update).not.toHaveBeenCalledWith(users);
  });
});
