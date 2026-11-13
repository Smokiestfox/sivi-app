import { requireReportStudent } from "../../../server/reports/auth";
import { createReport, ReportError } from "../../../server/reports/service";

export const runtime = "nodejs";

function json(body: object, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const expectedOrigin = new URL(process.env.APP_URL || request.url).origin;
    if (request.headers.get("origin") !== expectedOrigin) {
      throw new ReportError(403, "INVALID_ORIGIN", "Yêu cầu không hợp lệ. Vui lòng tải lại trang và thử lại.");
    }
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new ReportError(415, "INVALID_CONTENT_TYPE", "Yêu cầu phải sử dụng định dạng JSON.");
    }

    const user = await requireReportStudent();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ReportError(400, "INVALID_JSON", "Dữ liệu JSON không hợp lệ.");
    }

    const report = await createReport(user.id, body);
    return json({
      report,
      message: "Đã gửi báo cáo. Cảm ơn bạn đã hỗ trợ cộng đồng.",
    }, 201);
  } catch (error) {
    if (error instanceof ReportError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    // Do not expose SQL details or log the report text/session to the browser or logs.
    console.error("Report creation failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return json({ error: "Hệ thống đang bận, vui lòng thử lại sau.", code: "INTERNAL_ERROR" }, 500);
  }
}
