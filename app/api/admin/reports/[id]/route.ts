import { revalidatePath } from "next/cache";
import { AdminError, requireAdmin, resolveReportCluster } from "../../../../../server/admin/service";

export const runtime = "nodejs";

function json(body: object, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const expectedOrigin = new URL(process.env.APP_URL || request.url).origin;
    if (request.headers.get("origin") !== expectedOrigin) {
      throw new AdminError(403, "INVALID_ORIGIN", "Yêu cầu không hợp lệ. Vui lòng tải lại trang.");
    }
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new AdminError(415, "INVALID_CONTENT_TYPE", "Yêu cầu phải sử dụng định dạng JSON.");
    }
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      throw new AdminError(400, "INVALID_ID", "Mã báo cáo không hợp lệ.");
    }
    let body: unknown;
    try { body = await request.json(); } catch {
      throw new AdminError(400, "INVALID_JSON", "Dữ liệu JSON không hợp lệ.");
    }
    const result = await resolveReportCluster(admin.id, Number(id), body);
    // A committed decision stays successful even if cache invalidation is unavailable.
    try {
      for (const path of ["/admin", "/", "/review", "/profile", `/posts/${result.postId}`]) revalidatePath(path);
    } catch {
      console.error("Admin decision committed, but page revalidation failed.");
    }
    return json({ ...result, message: `Đã ${result.decision === "remove" ? "gỡ" : "giữ"} nội dung và xử lý ${result.processedCount} báo cáo.` }, 200);
  } catch (error) {
    if (error instanceof AdminError) return json({ error: error.message, code: error.code }, error.status);
    console.error("Admin report processing failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return json({ error: "Không thể xử lý báo cáo. Vui lòng thử lại sau.", code: "INTERNAL_ERROR" }, 500);
  }
}
