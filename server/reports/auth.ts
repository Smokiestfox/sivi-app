import { ReportError } from "./service";
import { getCurrentUser } from "../auth/current-user";

export async function requireReportStudent(): Promise<{ id: number }> {
  const user = await getCurrentUser();
  if (!user) throw new ReportError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để báo cáo nội dung.");
  if (user.role !== "student" || !user.isVerified) {
    throw new ReportError(403, "FORBIDDEN", "Bạn cần xác thực sinh viên để báo cáo nội dung.");
  }
  return { id: user.id };
}
