import { getCurrentUser } from "./current-user";
import { OtpError } from "./errors";

type OtpAction = (userId: number, body: unknown) => Promise<object>;

function json(body: object, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleOtpRoute(request: Request, action: OtpAction) {
  try {
    const appUrl = process.env.APP_URL ?? (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");
    if (!appUrl) {
      throw new OtpError(503, "AUTH_NOT_CONFIGURED", "Ứng dụng chưa được cấu hình.");
    }

    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(appUrl).origin;
    } catch {
      throw new OtpError(503, "AUTH_NOT_CONFIGURED", "Cấu hình URL ứng dụng không hợp lệ.");
    }
    if (request.headers.get("origin") !== expectedOrigin) {
      throw new OtpError(403, "INVALID_ORIGIN", "Nguồn yêu cầu không hợp lệ.");
    }
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new OtpError(415, "INVALID_CONTENT_TYPE", "Yêu cầu phải sử dụng định dạng JSON.");
    }

    const user = await getCurrentUser();
    if (!user) {
      throw new OtpError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để xác thực email trường.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new OtpError(400, "INVALID_JSON", "Dữ liệu JSON không hợp lệ.");
    }

    return json(await action(user.id, body), 200);
  } catch (error) {
    if (error instanceof OtpError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    console.error("Email OTP request failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return json({ error: "Hệ thống đang bận, vui lòng thử lại sau.", code: "INTERNAL_ERROR" }, 500);
  }
}
