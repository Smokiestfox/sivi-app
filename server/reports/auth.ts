import { requireStudent } from "../auth/service";
import { ForumError } from "../forum/errors";
import { ReportError } from "./service";

export async function requireReportStudent(request: Request): Promise<{ id: number }> {
  try {
    return await requireStudent(request);
  } catch (error) {
    if (error instanceof ForumError) {
      throw new ReportError(error.toResponse().status, error.code, error.message);
    }
    throw error;
  }
}
