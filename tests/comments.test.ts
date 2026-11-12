import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { POST as createPost } from "../app/api/posts/route";
import { POST } from "../app/api/posts/[id]/comments/route";
import { DELETE, PATCH } from "../app/api/comments/[id]/route";
import { listComments, listOwnComments } from "../server/comments/service";
import { comments, moderationLogs, posts } from "../server/db/schema";
import { getPost } from "../server/posts/service";
import {
  actors, approved, deleteRequest, deps, forumDatabase, forumMocks, hasTestDatabase,
  idContext, jsonRequest, multipart, roommate, testDb,
} from "./fixtures/forum";

vi.mock("../server/db/client", async () => ({ db: (await import("./fixtures/forum")).testDb }));
vi.mock("../server/forum/dependencies", async () => ({ forumDependencies: (await import("./fixtures/forum")).deps }));

forumMocks();
const newPost = async (): Promise<number> => (await (await createPost(multipart(roommate))).json()).id;
const createComment = (postId: number, content: string) => POST(jsonRequest({ content }), idContext(postId));

it("rejects invalid comment IDs and blank comments before moderation", async () => {
  expect((await POST(jsonRequest({ content: "xin chào" }), idContext("1e3"))).status).toBe(400);
  expect((await createComment(1, "   ")).status).toBe(400);
  expect(deps.moderate).not.toHaveBeenCalled();
});

describe.skipIf(!hasTestDatabase)("comments with PostgreSQL", () => {
  forumDatabase();

  it("creates approved comments and hides inactive comments and parent posts", async () => {
    const postId = await newPost();
    const response = await createComment(postId, "  Còn phòng không?  ");
    expect(response.status).toBe(201);
    const comment = await response.json();
    expect(comment).toMatchObject({ postId, content: "Còn phòng không?", author: { id: actors.student.id } });
    expect(await listComments(postId)).toMatchObject({ items: [comment] });
    expect(await listOwnComments(actors.student.id)).toMatchObject({ items: [comment] });
    expect(await getPost(postId)).toMatchObject({ counts: { comments: 1 } });
    await testDb.update(comments).set({ status: "hidden" }).where(eq(comments.id, comment.id));
    expect(await listComments(postId)).toMatchObject({ items: [] });
    expect(await getPost(postId)).toMatchObject({ counts: { comments: 0 } });

    expect((await createComment(postId, "Có thể hẹn xem phòng không?")).status).toBe(201);
    await testDb.update(posts).set({ status: "hidden" }).where(eq(posts.id, postId));
    expect(await listComments(postId)).toMatchObject({ items: [] });
    expect((await createComment(postId, "Không được ghi")).status).toBe(404);
  });

  it("rejects content and rechecks the parent after the AI call", async () => {
    const postId = await newPost();
    deps.moderate.mockResolvedValueOnce({ result: "rejected", reason: "Nội dung vi phạm" });
    expect((await createComment(postId, "Nội dung bị từ chối")).status).toBe(422);
    deps.moderate.mockImplementationOnce(async () => {
      await testDb.update(posts).set({ status: "hidden" }).where(eq(posts.id, postId));
      return approved;
    });
    expect((await createComment(postId, "Bài vừa bị gỡ")).status).toBe(404);
    expect(await testDb.select().from(comments)).toEqual([]);
    expect(await testDb.select().from(moderationLogs)).toHaveLength(1);
  });

  it("only lets the author edit or delete, and leaves rejected edits untouched", async () => {
    const postId = await newPost();
    const original = await (await createComment(postId, "Bản đầu")).json();
    const ctx = idContext(original.id);
    const edit = () => jsonRequest({ content: "Bản sửa" }, "PATCH");
    deps.getActor.mockResolvedValueOnce(actors.other).mockResolvedValueOnce(actors.other);
    expect((await PATCH(edit(), ctx)).status).toBe(403);
    expect((await DELETE(deleteRequest(), ctx)).status).toBe(403);
    deps.moderate.mockResolvedValueOnce({ result: "rejected", reason: "Nội dung vi phạm" });
    expect((await PATCH(edit(), ctx)).status).toBe(422);
    expect((await listComments(postId)).items[0].content).toBe("Bản đầu");
    expect((await PATCH(edit(), ctx)).status).toBe(200);
    expect((await listComments(postId)).items[0].content).toBe("Bản sửa");
    expect((await DELETE(deleteRequest(), ctx)).status).toBe(200);
    expect((await listComments(postId)).items).toEqual([]);
    expect(await testDb.select().from(moderationLogs).where(eq(moderationLogs.commentId, original.id))).toHaveLength(3);
  });
});
