import type { AuthUser } from "./service";

export { getCurrentUser } from "./service";
export type CurrentUser = Pick<AuthUser, "id" | "name" | "email" | "avatarUrl" | "role" | "isVerified">;
