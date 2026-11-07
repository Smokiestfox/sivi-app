import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { POST as createPost } from "../app/api/posts/route";
import { POST } from "../app/api/posts/[id]/vote/route";
import { posts, votes } from "../server/db/schema";
import { getPost } from "../server/posts/service";
import {
  actors, forumDatabase, forumMocks, hasTestDatabase, idContext, jsonRequest, multipart,
  review, roommate, testDb,
} from "./fixtures/forum";

vi.mock("../server/db/client", async () => ({ db: (await import("./fixtures/forum")).testDb }));
vi.mock("../server/forum/dependencies", async () => ({ forumDependencies: (await import("./fixtures/forum")).deps }));

forumMocks();
const cast = (id: number, value: number) => POST(jsonRequest({ value }), idContext(id));

it("rejects a vote value outside the allowed directions", async () => {
  expect((await cast(1, 0)).status).toBe(400);
});

describe.skipIf(!hasTestDatabase)("votes with PostgreSQL", () => {
  forumDatabase();

  it("inserts, changes and removes a vote on an active review", async () => {
    const { id } = await (await createPost(multipart(review))).json();
    const up = await cast(id, 1);
    expect(up.status).toBe(200);
    expect(await up.json()).toEqual({ counts: { upvotes: 1, downvotes: 0 }, currentUserVote: 1 });
    expect(await (await cast(id, -1)).json()).toEqual({ counts: { upvotes: 0, downvotes: 1 }, currentUserVote: -1 });
    expect(await getPost(id, actors.student.id)).toMatchObject({
      counts: { upvotes: 0, downvotes: 1 }, currentUserVote: -1,
    });
    expect(await getPost(id, actors.other.id)).toMatchObject({ currentUserVote: null });
    expect(await (await cast(id, -1)).json()).toEqual({ counts: { upvotes: 0, downvotes: 0 }, currentUserVote: null });
    expect(await testDb.select().from(votes)).toEqual([]);
  });

  it("rejects votes on roommate and hidden reviews", async () => {
    const shared = await (await createPost(multipart(roommate))).json();
    expect((await cast(shared.id, 1)).status).toBe(400);
    const hidden = await (await createPost(multipart(review))).json();
    await testDb.update(posts).set({ status: "hidden" }).where(eq(posts.id, hidden.id));
    expect((await cast(hidden.id, 1)).status).toBe(404);
    expect(await testDb.select().from(votes)).toEqual([]);
  });

  it("serializes concurrent toggles from the same user", async () => {
    const { id } = await (await createPost(multipart(review))).json();
    const results = await Promise.all([cast(id, 1), cast(id, 1)]);
    expect(results.map((response) => response.status)).toEqual([200, 200]);
    const bodies = await Promise.all(results.map((response) => response.json()));
    expect(bodies).toEqual(expect.arrayContaining([
      { counts: { upvotes: 1, downvotes: 0 }, currentUserVote: 1 },
      { counts: { upvotes: 0, downvotes: 0 }, currentUserVote: null },
    ]));
    expect(await testDb.select().from(votes)).toEqual([]);
  });
});
