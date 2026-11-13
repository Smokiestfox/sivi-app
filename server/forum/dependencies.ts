import type { ForumDependencies } from "./contracts";
import { ForumError } from "./errors";
import { removeImage, saveImage } from "../uploads/service";

async function unavailable(): Promise<never> {
  throw new ForumError("SERVICE_UNAVAILABLE", "Dịch vụ chưa sẵn sàng. Vui lòng thử lại sau.");
}

// AUTH-01 and AI-02 still fail closed until their adapters are wired.
export const forumDependencies: ForumDependencies = {
  async getActor(request) {
    if (!/(?:^|;\s*)sivi_session=/.test(request.headers.get("cookie") ?? "")) return null;
    return unavailable();
  },
  moderate: unavailable,
  saveImage,
  removeImage,
};
