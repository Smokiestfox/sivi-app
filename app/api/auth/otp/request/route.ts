import { and, eq, or } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getCurrentUser } from "@/server/auth/current-user";
import { authJson, readAuthJson, validAuthOrigin } from "@/server/auth/http";
import { db } from "@/server/db/client";
import { universityDomains, users, verificationRequests } from "@/server/db/schema";

function otpHash(userId: number, email: string) {
  return createHash("sha256").update(`${userId}:${email}:123456`).digest("hex");
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
  const rawEmail = body !== null && typeof body === "object" && "email" in body ? body.email : null;
  if (typeof rawEmail !== "string" || rawEmail.length > 254) {
    return authJson({ error: "Vui lòng nhập email trường hợp lệ." }, 400);
  }
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return authJson({ error: "Vui lòng nhập email trường hợp lệ." }, 400);
  }
  const domainName = email.split("@")[1];

  try {
    const domains = await db.select({
      universityId: universityDomains.universityId,
      domain: universityDomains.domain,
    }).from(universityDomains).where(eq(universityDomains.domainType, "student"));
    const domain = domains.find((item) => domainName === item.domain || domainName.endsWith(`.${item.domain}`));
    if (!domain || !domainName.endsWith(".edu.vn")) {
      return authJson({ error: "Email cần thuộc tên miền sinh viên .edu.vn đã đăng ký trong hệ thống." }, 400);
    }

    const [duplicate] = await db.select({ id: users.id }).from(users)
      .where(or(eq(users.universityEmail, email), eq(users.email, email))).limit(1);
    if (duplicate && duplicate.id !== user.id) {
      return authJson({ error: "Email trường này đã được liên kết với tài khoản khác." }, 409);
    }

    await db.transaction(async (tx) => {
      await tx.update(verificationRequests).set({ status: "expired" })
        .where(and(
          eq(verificationRequests.userId, user.id),
          eq(verificationRequests.status, "pending"),
        ));
      await tx.insert(verificationRequests).values({
        userId: user.id,
        email,
        universityId: domain.universityId,
        otpHash: otpHash(user.id, email),
        otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
        status: "pending",
      });
    });
    return authJson({
      message: "Mã xác thực đã sẵn sàng.",
      expiresIn: 300,
      demoOtp: "123456",
    });
  } catch (error) {
    console.error("OTP request failed", error instanceof Error ? error.name : "UnknownError");
    return authJson({ error: "Không thể tạo mã xác thực. Vui lòng thử lại." }, 503);
  }
}
