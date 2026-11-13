import { getCurrentUser } from "../auth/service";
import type { ForumDependencies } from "./contracts";
import { ForumError } from "./errors";
import { removeImage, saveImage } from "../uploads/service";

async function unavailable(): Promise<never> {
  throw new ForumError("SERVICE_UNAVAILABLE", "Dịch vụ chưa sẵn sàng. Vui lòng thử lại sau.");
}

// Moderation remains unavailable until AI-02 is integrated.
export const forumDependencies: ForumDependencies = {
  getActor: getCurrentUser,
  moderate: unavailable,
  saveImage,
  removeImage,
};
