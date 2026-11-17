import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ForumActor, ForumDependencies } from "../server/forum/contracts";
import type { PostPayload } from "../server/posts/payload";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  write: vi.fn(),
}));
vi.mock("../server/db/client", () => ({
  db: { select: mocks.select, transaction: mocks.transaction, update: mocks.write, delete: mocks.write },
}));

import { updatePost, deletePost } from "../server/posts/service";
import { updateComment, deleteComment } from "../server/comments/service";

const deps: ForumDependencies = {
  getActor: vi.fn(), moderate: vi.fn(), saveImage: vi.fn(), removeImage: vi.fn(),
};
const payload: PostPayload = {
  type: "roommate", title: "Room", content: "Description", rent: 1000000,
  peopleNeeded: 1, genderPreference: "any", roomType: "shared", amenities: [],
};
const other: ForumActor = { id: 2, role: "student", isVerified: true };
let selectedOwner: number;
let query: {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  for: ReturnType<typeof vi.fn>;
  then: (resolve: (value: object[]) => unknown) => Promise<unknown>;
};

beforeEach(() => {
  vi.clearAllMocks();
  selectedOwner = 1;
  query = {
    from: vi.fn(() => query), where: vi.fn(() => query),
    innerJoin: vi.fn(() => query), for: vi.fn(() => query),
    then: (resolve) => Promise.resolve(resolve([{
      id: 10, postId: 10, authorId: selectedOwner, type: "roommate", revision: "1",
    }])),
  };
  mocks.select.mockImplementation(() => { return query; });
  mocks.select.mockReturnValue(query);
  mocks.transaction.mockImplementation(async (run) => run({
    select: mocks.select, update: mocks.write, delete: mocks.write,
  }));
});

const operations = {
  "edit post": (actor: ForumActor) => updatePost(deps, actor, 10, payload, [], []),
  "delete post": (actor: ForumActor) => deletePost(deps, actor, 10),
  "edit comment": (actor: ForumActor) => updateComment(deps, actor, 10, "Updated"),
  "delete comment": (actor: ForumActor) => deleteComment(actor, 10),
};

describe("server ownership boundaries", () => {
  for (const [name, run] of Object.entries(operations)) {
    it(`blocks another verified student from ${name}`, async () => {
      await expect(run(other)).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(deps.moderate).not.toHaveBeenCalled();
      expect(deps.saveImage).not.toHaveBeenCalled();
      expect(mocks.write).not.toHaveBeenCalled();
    });

    it.each([
      { id: 1, role: "guest", isVerified: false },
      { id: 1, role: "student", isVerified: false },
      { id: 2, role: "admin", isVerified: true },
    ] as ForumActor[])(`blocks invalid role/verification from ${name}: %j`, async (actor) => {
      await expect(run(actor)).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mocks.select).not.toHaveBeenCalled();
      expect(mocks.write).not.toHaveBeenCalled();
    });
  }

  it("rechecks the post owner under the transaction lock before deleting", async () => {
    mocks.select.mockImplementation(() => {
      selectedOwner = 2;
      return query;
    });
    await expect(deletePost(deps, { ...other, id: 1 }, 10))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(query.for).toHaveBeenCalledWith("update");
    expect(mocks.write).not.toHaveBeenCalled();
  });
});
