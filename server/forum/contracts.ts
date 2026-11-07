import type { db } from "../db/client";

export type ForumTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type ForumReader = typeof db | ForumTransaction;

export type ForumActor = {
  id: number;
  role: "guest" | "student" | "admin";
  isVerified: boolean;
};

export type ModerationInput = {
  contentType: "post" | "comment";
  postId?: number;
  commentId?: number;
  title: string;
  body: string;
};

export type ModerationDecision =
  | { result: "rejected"; reason: string }
  | {
      result: "approved";
      needsReview: boolean;
      tags: string[];
      scores: Record<string, number>;
      modelVersion: string;
      policyVersion: string;
    };

export type StoredImage = {
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
};

export interface ForumDependencies {
  getActor(request: Request): Promise<ForumActor | null>;
  moderate(input: ModerationInput): Promise<ModerationDecision>;
  saveImage(file: File): Promise<StoredImage>;
  removeImage(storageKey: string): Promise<void>;
}
