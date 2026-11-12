import { and, desc, eq, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getCurrentUser } from "@/server/auth/current-user";
import { authJson, readAuthJson, validAuthOrigin } from "@/server/auth/http";
import { db } from "@/server/db/client";
import { users, verificationRequests } from "@/server/db/schema";

function otpHash(userId: number, email: string, code: string) {
  return createHash("sha256").update(`${userId}:${email}:${code}`).digest("hex");
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return authJson({ error: "OTP demo chỉ dùng ở môi trường local." }, 404);
  if (!validAuthOrigin(request)) return authJson({ error: "Nguồn yêu cầu không hợp lệ." }, 403);
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("Could not load OTP session", error instanceof Error ? error.name : "UnknownError");
    return authJson({ error: "Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại." }, 503);
  }
  if (!user) return authJson({ error: "Vui lòng đăng nhập trước khi xác thực." }, 401);

  let body: unknown;
  try {
    body = await readAuthJson(request);
  } catch {
    return authJson({ error: "Dữ liệu yêu cầu không hợp lệ." }, 400);
  }
  const emailValue = body !== null && typeof body === "object" && "email" in body ? body.email : null;
  const codeValue = body !== null && typeof body === "object" && "code" in body ? body.code : null;
  if (typeof emailValue !== "string" || emailValue.length > 254 || typeof codeValue !== "string" || !/^\d{6}$/.test(codeValue)) {
    return authJson({ error: "Email hoặc mã OTP không hợp lệ." }, 400);
  }
  const email = emailValue.trim().toLowerCase();

  try {
    const result = await db.transaction(async (tx) => {
      const [verification] = await tx.select().from(verificationRequests)
        .where(and(
          eq(verificationRequests.userId, user.id),
          eq(verificationRequests.email, email),
          inArray(verificationRequests.status, ["pending", "locked"]),
        ))
        .orderBy(desc(verificationRequests.sentAt))
        .limit(1)
        .for("update");
      if (!verification) return { status: 404 as const, error: "Chưa có mã OTP đang chờ xác thực." };
      if (verification.otpExpiresAt <= new Date()) {
        await tx.update(verificationRequests).set({ status: "expired" })
          .where(eq(verificationRequests.id, verification.id));
        return { status: 410 as const, error: "Mã OTP đã hết hạn. Hãy yêu cầu mã mới." };
      }
      if (verification.attempts >= 5 || verification.status === "locked") {
        return { status: 429 as const, error: "Mã OTP đã bị khóa. Hãy yêu cầu mã mới." };
      }
      if (verification.otpHash !== otpHash(user.id, email, codeValue)) {
        const attempts = verification.attempts + 1;
        await tx.update(verificationRequests).set({
          attempts,
          status: attempts >= 5 ? "locked" : "pending",
        }).where(eq(verificationRequests.id, verification.id));
        return {
          status: attempts >= 5 ? 429 as const : 400 as const,
          error: attempts >= 5 ? "Mã OTP đã bị khóa. Hãy yêu cầu mã mới." : "Mã OTP không đúng.",
          remainingAttempts: Math.max(0, 5 - attempts),
        };
      }

      const [updatedUser] = await tx.update(users).set({
        isVerified: true,
        role: "student",
        universityId: verification.universityId,
        universityEmail: verification.email,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id)).returning({ id: users.id });
      if (!updatedUser) return { status: 401 as const, error: "Tài khoản không còn tồn tại." };
      await tx.update(verificationRequests).set({
        status: "verified",
        verifiedAt: new Date(),
      }).where(eq(verificationRequests.id, verification.id));
      return { status: 200 as const, message: "Xác thực sinh viên thành công." };
    });
    return authJson(result, result.status);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return authJson({ error: "Email trường này đã được liên kết với tài khoản khác." }, 409);
    }
    console.error("OTP verification failed", error instanceof Error ? error.name : "UnknownError");
    return authJson({ error: "Không thể xác thực mã OTP. Vui lòng thử lại." }, 503);
  }
}
