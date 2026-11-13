import { getCurrentUser } from "../auth/service";
import type { ForumDependencies } from "./contracts";
import { ForumError } from "./errors";

async function unavailable(): Promise<never> {
  throw new ForumError("SERVICE_UNAVAILABLE", "Dịch vụ chưa sẵn sàng. Vui lòng thử lại sau.");
}

// Wire moderation and storage here once AI-02 and IMG-01 land.
export const forumDependencies: ForumDependencies = {
  getActor: getCurrentUser,
  moderate: unavailable,
  saveImage: unavailable,
  removeImage: unavailable,
};
