import { getCurrentUser } from "../auth/service";
import type { ForumDependencies } from "./contracts";
import { moderate } from "../moderation/service";
import { describeImage } from "../moderation/image";
import { removeImage, saveImage } from "../uploads/service";

export const forumDependencies: ForumDependencies = {
  getActor: getCurrentUser,
  moderate,
  saveImage,
  describeImage,
  removeImage,
};
