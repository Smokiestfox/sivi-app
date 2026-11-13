import { ReportError } from "./service";

/**
 * AUTH-01/02 handoff for Đạt: replace this body with the real requireStudent().
 * Return a verified server-session user id, or throw ReportError(401/403, ...).
 * Until auth is connected, fail closed; never accept user ids/roles from the client.
 */
export async function requireReportStudent(): Promise<{ id: number }> {
  throw new ReportError(
    503,
    "AUTH_NOT_READY",
    "Chức năng báo cáo đang chờ kết nối xác thực. Vui lòng thử lại sau.",
  );
}
