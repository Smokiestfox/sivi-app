import { authJson, validAuthOrigin } from "@/server/auth/http";
import { clearedSessionCookie, revokeSession, SESSION_COOKIE } from "@/server/auth/session";

export async function POST(request: Request) {
  if (!validAuthOrigin(request)) return authJson({ error: "Nguồn yêu cầu không hợp lệ." }, 403);
  const cookie = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = cookie?.slice(SESSION_COOKIE.length + 1);
  try {
    if (token) await revokeSession(token);
  } catch (error) {
    console.error("Session revocation failed", error instanceof Error ? error.name : "UnknownError");
    return authJson({ error: "Không thể đăng xuất lúc này. Vui lòng thử lại." }, 503);
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Set-Cookie": clearedSessionCookie(),
    },
  });
}
