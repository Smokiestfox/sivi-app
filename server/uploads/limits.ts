import { ForumError } from "../forum/errors";

export const MAX_POST_IMAGES = 5;
export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function getMaxUploadBytes(): number {
  const configured = process.env.MAX_UPLOAD_BYTES;
  if (configured === undefined || configured === "") return DEFAULT_MAX_UPLOAD_BYTES;

  const limit = Number(configured);
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new ForumError("SERVICE_UNAVAILABLE", "Cấu hình giới hạn tải ảnh không hợp lệ.");
  }
  return limit;
}
