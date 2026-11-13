import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { studentProfiles, universityDomains, users, verificationRequests } from "../db/schema";
import { prepareOtpEmail } from "./email";
import { OtpError } from "./errors";

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const requestSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
}).strict();

const verifySchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  otp: z.string().regex(/^\d{6}$/),
}).strict();

function parseInput<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new OtpError(400, "INVALID_INPUT", "Thông tin email hoặc mã OTP không hợp lệ.");
  }
  return parsed.data;
}

function getOtpSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new OtpError(503, "OTP_NOT_CONFIGURED", "Dịch vụ xác thực email chưa được cấu hình.");
  }
  return secret;
}

function hashOtp(secret: string, userId: number, email: string, otp: string): string {
  return createHmac("sha256", secret).update(`${userId}\0${email}\0${otp}`).digest("hex");
}

async function lockOtpKeys(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: number, email: string) {
  const keys = [`otp:email:${email}`, `otp:user:${userId}`].sort();
  for (const key of keys) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
  }
}

export async function requestOtp(userId: number, body: unknown) {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new OtpError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để xác thực email trường.");
  }

  const { email } = parseInput(requestSchema, body);
  const secret = getOtpSecret();
  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const deliverEmail = prepareOtpEmail(email, otp);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_LIFETIME_MS);

  const requestId = await db.transaction(async (tx) => {
    await lockOtpKeys(tx, userId, email);

    const [user] = await tx.select({ id: users.id, role: users.role, isVerified: users.isVerified })
      .from(users)
      .where(eq(users.id, userId))
      .for("update")
      .limit(1);
    if (!user) {
      throw new OtpError(401, "UNAUTHENTICATED", "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.");
    }
    if (user.role !== "guest" || user.isVerified) {
      throw new OtpError(403, "FORBIDDEN", "Chỉ tài khoản guest chưa xác thực mới có thể xác minh email trường.");
    }

    const domain = email.slice(email.lastIndexOf("@") + 1);
    const [university] = await tx.select({ id: universityDomains.universityId })
      .from(universityDomains)
      .where(and(eq(universityDomains.domain, domain), eq(universityDomains.domainType, "student")))
      .limit(1);
    if (!university) {
      throw new OtpError(400, "UNSUPPORTED_EMAIL_DOMAIN", "Email không thuộc domain sinh viên đã được hỗ trợ.");
    }

    const [emailOwner] = await tx.select({ id: users.id })
      .from(users)
      .where(and(eq(users.universityEmail, email), ne(users.id, userId)))
      .limit(1);
    if (emailOwner) {
      throw new OtpError(409, "EMAIL_ALREADY_USED", "Email trường này đã được liên kết với tài khoản khác.");
    }

    const cooldown = new Date(now.getTime() - OTP_COOLDOWN_MS);
    const [recentUserRequest] = await tx.select({ sentAt: verificationRequests.sentAt })
      .from(verificationRequests)
      .where(and(eq(verificationRequests.userId, userId), gt(verificationRequests.sentAt, cooldown)))
      .orderBy(desc(verificationRequests.sentAt))
      .limit(1);
    const [recentEmailRequest] = await tx.select({ sentAt: verificationRequests.sentAt })
      .from(verificationRequests)
      .where(and(eq(verificationRequests.email, email), gt(verificationRequests.sentAt, cooldown)))
      .orderBy(desc(verificationRequests.sentAt))
      .limit(1);
    if (recentUserRequest || recentEmailRequest) {
      throw new OtpError(429, "OTP_RATE_LIMITED", "Vui lòng đợi 60 giây trước khi yêu cầu mã mới.");
    }

    await tx.update(verificationRequests)
      .set({ status: "expired" })
      .where(and(
        eq(verificationRequests.userId, userId),
        eq(verificationRequests.status, "pending"),
      ));

    const [created] = await tx.insert(verificationRequests).values({
      userId,
      email,
      universityId: university.id,
      otpHash: hashOtp(secret, userId, email, otp),
      otpExpiresAt: expiresAt,
      attempts: 0,
      status: "pending",
      sentAt: now,
    }).returning({ id: verificationRequests.id });
    if (!created) throw new Error("OTP verification request was not inserted.");
    return created.id;
  });

  try {
    await deliverEmail();
  } catch {
    await db.update(verificationRequests)
      .set({ status: "failed" })
      .where(and(eq(verificationRequests.id, requestId), eq(verificationRequests.status, "pending")));
    throw new OtpError(503, "EMAIL_DELIVERY_FAILED", "Không gửi được email xác thực. Vui lòng thử lại sau.");
  }

  return { message: "Đã gửi mã xác thực đến email trường.", expiresInSeconds: OTP_LIFETIME_MS / 1000 };
}

export async function verifyOtp(userId: number, body: unknown) {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new OtpError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để xác thực email trường.");
  }

  const { email, otp } = parseInput(verifySchema, body);
  const secret = getOtpSecret();
  const now = new Date();

  const outcome = await db.transaction(async (tx) => {
    await lockOtpKeys(tx, userId, email);

    const [user] = await tx.select({ id: users.id, role: users.role, isVerified: users.isVerified })
      .from(users)
      .where(eq(users.id, userId))
      .for("update")
      .limit(1);
    if (!user) {
      throw new OtpError(401, "UNAUTHENTICATED", "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.");
    }
    if (user.role !== "guest" || user.isVerified) {
      throw new OtpError(403, "FORBIDDEN", "Tài khoản này không thể xác thực email trường.");
    }

    const [verification] = await tx.select({
      id: verificationRequests.id,
      universityId: verificationRequests.universityId,
      otpHash: verificationRequests.otpHash,
      otpExpiresAt: verificationRequests.otpExpiresAt,
      attempts: verificationRequests.attempts,
      status: verificationRequests.status,
    })
      .from(verificationRequests)
      .where(and(eq(verificationRequests.userId, userId), eq(verificationRequests.email, email)))
      .orderBy(desc(verificationRequests.createdAt), desc(verificationRequests.id))
      .for("update")
      .limit(1);

    if (!verification) {
      throw new OtpError(404, "OTP_NOT_FOUND", "Không tìm thấy mã xác thực đang chờ.");
    }
    if (verification.status === "locked") {
      throw new OtpError(423, "OTP_LOCKED", "Mã xác thực đã bị khóa. Vui lòng yêu cầu mã mới sau.");
    }
    if (verification.status === "expired" || verification.otpExpiresAt <= now) {
      if (verification.status === "pending") {
        await tx.update(verificationRequests)
          .set({ status: "expired" })
          .where(eq(verificationRequests.id, verification.id));
      }
      return { error: new OtpError(410, "OTP_EXPIRED", "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.") };
    }
    if (verification.status !== "pending") {
      throw new OtpError(400, "OTP_NOT_PENDING", "Mã xác thực này không còn hiệu lực.");
    }

    const expected = Buffer.from(verification.otpHash, "hex");
    const supplied = Buffer.from(hashOtp(secret, userId, email, otp), "hex");
    const matches = expected.length === supplied.length && timingSafeEqual(expected, supplied);
    if (!matches) {
      const attempts = verification.attempts + 1;
      const locked = attempts >= MAX_OTP_ATTEMPTS;
      await tx.update(verificationRequests)
        .set({ attempts, status: locked ? "locked" : "pending" })
        .where(eq(verificationRequests.id, verification.id));
      return {
        error: new OtpError(
          locked ? 423 : 400,
          locked ? "OTP_LOCKED" : "OTP_INVALID",
          locked ? "Bạn đã nhập sai mã quá nhiều lần. Vui lòng yêu cầu mã mới sau." : "Mã xác thực không chính xác.",
        ),
      };
    }

    const domain = email.slice(email.lastIndexOf("@") + 1);
    const [university] = await tx.select({ id: universityDomains.universityId })
      .from(universityDomains)
      .where(and(eq(universityDomains.domain, domain), eq(universityDomains.domainType, "student")))
      .limit(1);
    if (!university || university.id !== verification.universityId) {
      await tx.update(verificationRequests)
        .set({ status: "failed" })
        .where(eq(verificationRequests.id, verification.id));
      return { error: new OtpError(400, "UNSUPPORTED_EMAIL_DOMAIN", "Domain email không còn được hỗ trợ.") };
    }

    const [emailOwner] = await tx.select({ id: users.id })
      .from(users)
      .where(and(eq(users.universityEmail, email), ne(users.id, userId)))
      .limit(1);
    if (emailOwner) {
      await tx.update(verificationRequests)
        .set({ status: "failed" })
        .where(eq(verificationRequests.id, verification.id));
      return { error: new OtpError(409, "EMAIL_ALREADY_USED", "Email trường này đã được liên kết với tài khoản khác.") };
    }

    await tx.update(users)
      .set({
        universityEmail: email,
        universityId: university.id,
        role: "student",
        isVerified: true,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
    await tx.insert(studentProfiles)
      .values({ userId })
      .onConflictDoNothing();
    await tx.update(verificationRequests)
      .set({ status: "verified", verifiedAt: now })
      .where(eq(verificationRequests.id, verification.id));

    return { user: { id: userId, role: "student" as const, isVerified: true } };
  });

  if ("error" in outcome) throw outcome.error;
  return { ...outcome, message: "Email đã được xác thực. Tài khoản của bạn đã chuyển thành student." };
}
