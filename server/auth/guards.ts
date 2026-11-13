import type { ForumActor } from "../forum/contracts";
import { ForumError } from "../forum/errors";

export function assertUser<T extends ForumActor>(user: T | null): T {
  if (!user) throw new ForumError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
  return user;
}

export function assertStudent<T extends ForumActor>(user: T | null): T {
  const current = assertUser(user);
  if (current.role !== "student" || !current.isVerified) {
    throw new ForumError("FORBIDDEN", "Cần xác thực sinh viên để thực hiện thao tác này.");
  }
  return current;
}
