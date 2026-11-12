import { ForumError } from "../forum/errors";

export function authOrigin() {
  const configured = process.env.APP_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  try {
    const url = new URL(configured);
    const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol === "https:" || localHttp) && !url.username && !url.password &&
        url.pathname === "/" && !url.search && !url.hash) {
      return url.origin;
    }
  } catch {
    // Report invalid and missing values without returning the configured URL.
  }
  throw new ForumError("SERVICE_UNAVAILABLE", "Ứng dụng chưa được cấu hình đăng nhập.");
}

export function authCookie(origin: string, name: "sivi_session" | "sivi_oauth", maxAge: number) {
  const secure = new URL(origin).protocol === "https:";
  return {
    name: secure ? "__Host-" + name : name,
    secure,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function readAuthCookie(cookieHeader: string | null, name: string) {
  const prefix = name + "=";
  const matches = cookieHeader?.split(";").map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith(prefix));
  if (matches?.length !== 1) return null;
  return matches[0].slice(prefix.length);
}

export async function authRoute(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ForumError) return error.toResponse();
    console.error("Auth request failed", error instanceof Error ? error.name : "UnknownError");
    return new ForumError("SERVICE_UNAVAILABLE", "Đăng nhập tạm thời chưa khả dụng.").toResponse();
  }
}
