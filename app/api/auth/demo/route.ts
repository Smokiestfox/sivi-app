import { getDemoUser, type DemoRole } from "@/server/auth/demo";
import { authJson, readAuthJson, validAuthOrigin } from "@/server/auth/http";
import { createSession, sessionCookie } from "@/server/auth/session";

const roles = new Set<DemoRole>(["guest", "student", "admin"]);

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return authJson({ error: "Đăng nhập demo chỉ dùng ở môi trường local." }, 404);
  if (!validAuthOrigin(request)) return authJson({ error: "Nguồn yêu cầu không hợp lệ." }, 403);

  let body: unknown;
  try {
    body = await readAuthJson(request);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_JSON";
    const status = code === "INVALID_CONTENT_TYPE" ? 415 : code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
    return authJson({ error: "Dữ liệu đăng nhập không hợp lệ." }, status);
  }
  const role = body !== null && typeof body === "object" && "role" in body ? body.role : "guest";
  if (typeof role !== "string" || !roles.has(role as DemoRole)) {
    return authJson({ error: "Tài khoản demo không hợp lệ." }, 400);
  }

  try {
    const user = await getDemoUser(role as DemoRole);
    const token = await createSession(user.id);
    return new Response(JSON.stringify({ user: { id: user.id, role } }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": sessionCookie(token),
      },
    });
  } catch (error) {
    console.error("Demo login failed", error instanceof Error ? error.name : "UnknownError");
    return authJson({ error: "Không thể đăng nhập demo. Hãy kiểm tra kết nối cơ sở dữ liệu." }, 503);
  }
}
