import type { ForumDependencies } from "./contracts";
import { ForumError } from "./errors";

async function unavailable(): Promise<never> {
  throw new ForumError("SERVICE_UNAVAILABLE", "Dịch vụ chưa sẵn sàng. Vui lòng thử lại sau.");
}

// Wire the team-owned services here once AUTH-01, AI-02 and IMG-01 land.
export const forumDependencies: ForumDependencies = {
  async getActor(request) {
    if (!/(?:^|;\s*)sivi_session=/.test(request.headers.get("cookie") ?? "")) return null;
    return unavailable();
  },
  moderate: unavailable,
  saveImage: unavailable,
  removeImage: unavailable,
};
