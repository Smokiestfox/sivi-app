import type { ForumDependencies } from "./contracts";
import { getActorForRequest } from "../auth/session";
import { moderate } from "../moderation/service";
import { removeImage, saveImage } from "../uploads/service";

export const forumDependencies: ForumDependencies = {
  getActor: getActorForRequest,
  moderate,
  saveImage,
  removeImage,
};
