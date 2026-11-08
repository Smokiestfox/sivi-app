import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { votes } from "../db/schema";
import type { ForumActor } from "../forum/contracts";
import { ForumError } from "../forum/errors";
import { requireStudent } from "../forum/mutation";
import { lockActivePost } from "../posts/service";

export async function vote(actor: ForumActor, postId: number, value: 1 | -1) {
  requireStudent(actor);
  return db.transaction(async (tx) => {
    const post = await lockActivePost(tx, postId);
    if (post.type !== "review") {
      throw new ForumError("VALIDATION_ERROR", "Chỉ có thể bình chọn cho bài review.");
    }

    const target = and(eq(votes.postId, postId), eq(votes.userId, actor.id));
    const [existing] = await tx.select({ value: votes.value }).from(votes).where(target);
    let currentUserVote: 1 | -1 | null = value;
    if (existing?.value === value) {
      await tx.delete(votes).where(target);
      currentUserVote = null;
    } else {
      await tx.insert(votes).values({ postId, userId: actor.id, value })
        .onConflictDoUpdate({ target: [votes.userId, votes.postId], set: { value } });
    }

    const [counts] = await tx.select({
      upvotes: sql<number>`count(*) filter (where ${votes.value} = 1)::int`,
      downvotes: sql<number>`count(*) filter (where ${votes.value} = -1)::int`,
    }).from(votes).where(eq(votes.postId, postId));
    return { counts, currentUserVote };
  });
}
