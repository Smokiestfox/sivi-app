import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/posts/route";
import { DELETE, PATCH } from "../app/api/posts/[id]/route";
import { moderationLogs, postImages, posts, reviewPosts, roommatePosts } from "../server/db/schema";
import { ForumError } from "../server/forum/errors";
import type { ModerationDecision } from "../server/forum/contracts";
import { mutation } from "../server/forum/mutation";
import { getPost, listOwnPosts, listPosts } from "../server/posts/service";
import {
  actors, approved, deleteRequest, deps, forumDatabase, forumMocks, hasTestDatabase, idContext,
  jsonRequest, multipart, review, roommate, testDb,
} from "./fixtures/forum";

vi.mock("../server/db/client", async () => ({ db: (await import("./fixtures/forum")).testDb }));
vi.mock("../server/forum/dependencies", async () => ({ forumDependencies: (await import("./fixtures/forum")).deps }));

forumMocks();
const image = (name: string) => new File([name], name + ".webp", { type: "image/webp" });

describe("forum write boundary", () => {
  it("rejects missing and malformed session tokens with the default dependencies", async () => {
    const { forumDependencies } = await vi.importActual<typeof import("../server/forum/dependencies")>(
      "../server/forum/dependencies",
    );
    const run = vi.fn(async () => Response.json({ ok: true }));
    const handler = mutation(forumDependencies, run);
    const anonymous = jsonRequest({});
    anonymous.headers.set("cookie", "theme=dark");
    expect((await handler(anonymous)).status).toBe(401);
    const withSession = jsonRequest({});
    withSession.headers.set("cookie", "sivi_session=fixture");
    expect((await handler(withSession)).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects cross-origin writes before checking the session", async () => {
    const response = await POST(jsonRequest(roommate, "POST", "https://untrusted.test"));
    expect(response.status).toBe(403);
    expect(deps.getActor).not.toHaveBeenCalled();
  });

  it("rejects anonymous, guest and unverified accounts", async () => {
    deps.getActor.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...actors.student, role: "guest" })
      .mockResolvedValueOnce({ ...actors.student, isVerified: false });

    expect((await POST(multipart(roommate))).status).toBe(401);
    expect((await POST(multipart(roommate))).status).toBe(403);
    expect((await POST(multipart(roommate))).status).toBe(403);
    expect(deps.moderate).not.toHaveBeenCalled();
  });

  it("reports invalid fields and limits multipart image count before moderation", async () => {
    const invalid = await POST(multipart({ ...review, rating: 6 }));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ error: { code: "VALIDATION_ERROR", fields: { "payload.rating": expect.any(String) } } });
    const many = await POST(multipart(review, { files: Array.from({ length: 6 }, (_, i) => image(String(i))) }));
    expect(many.status).toBe(400);
    expect(deps.moderate).not.toHaveBeenCalled();
  });

  it("bounds the body even if there is no Content-Length", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(27 * 1024 * 1024));
        controller.close();
      },
    });
    const request = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "multipart/form-data; boundary=SiVi" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    expect((await POST(request)).status).toBe(413);
    expect(deps.moderate).not.toHaveBeenCalled();
  });

  it("fails closed for rejection, outage and invalid approval", async () => {
    deps.moderate.mockResolvedValueOnce({ result: "rejected", reason: "Nội dung vi phạm" })
      .mockRejectedValueOnce(new ForumError("SERVICE_UNAVAILABLE", "AI timeout"))
      .mockResolvedValueOnce({ result: "approved" } as ModerationDecision);
    expect((await POST(multipart(roommate, { files: [image("one")] }))).status).toBe(422);
    expect((await POST(multipart(roommate))).status).toBe(503);
    expect((await POST(multipart(roommate))).status).toBe(503);
    expect(deps.saveImage).not.toHaveBeenCalled();
  });
});

describe.skipIf(!hasTestDatabase)("posts with PostgreSQL", () => {
  forumDatabase();

  it("creates both subtypes, logs approval and reads only active posts", async () => {
    const first = await POST(multipart(roommate, { files: [image("one")] }));
    expect(first.status).toBe(201);
    const body = await first.json();
    expect(body).toMatchObject({
      title: roommate.title, type: "roommate", rent: roommate.rent, status: "active",
      author: { id: actors.student.id }, images: [{ url: expect.stringMatching(/^\/media\//) }],
    });
    expect(body.author).not.toHaveProperty("email");
    expect(body.images[0]).not.toHaveProperty("storageKey");
    expect(deps.moderate).toHaveBeenCalledWith({
      contentType: "post", title: roommate.title,
      body: [roommate.content, roommate.address, roommate.district, roommate.roommateRequirements,
        roommate.contactInfo, ...roommate.amenities].join("\n"),
    });

    const second = await POST(multipart(review));
    expect(second.status).toBe(201);
    const reviewed = await second.json();
    expect(reviewed).toMatchObject({ type: "review", placeName: review.placeName, rating: 4 });
    expect(await testDb.select().from(roommatePosts)).toHaveLength(1);
    expect(await testDb.select().from(reviewPosts)).toHaveLength(1);
    expect(await testDb.select().from(moderationLogs)).toEqual(expect.arrayContaining([
      expect.objectContaining({ postId: body.id, result: "approved", needsReview: true, modelVersion: approved.modelVersion }),
      expect.objectContaining({ postId: reviewed.id, result: "approved" }),
    ]));

    expect((await listPosts({ type: "roommate", q: "phòng", maxPrice: 2_000_000 })).items).toHaveLength(1);
    expect((await listPosts({ type: "roommate", q: "%" })).items).toEqual([]);
    expect((await listOwnPosts(actors.student.id)).items).toHaveLength(2);
    await testDb.update(posts).set({ status: "hidden" }).where(eq(posts.id, body.id));
    expect(await getPost(body.id, actors.student.id)).toBeNull();
    expect((await listPosts({ type: "roommate" })).items).toEqual([]);
    expect((await listOwnPosts(actors.student.id)).items).toHaveLength(1);
  });

  it("pages by ID even after the previous page's last item is hidden", async () => {
    const older = await (await POST(multipart(review))).json();
    const newer = await (await POST(multipart(review))).json();
    const page = await listPosts({ type: "review", limit: 1 });
    expect(page).toMatchObject({ items: [{ id: newer.id }], nextCursor: newer.id });
    await testDb.update(posts).set({ status: "hidden" }).where(eq(posts.id, newer.id));
    expect(await listPosts({ type: "review", limit: 1, cursor: page.nextCursor! }))
      .toMatchObject({ items: [{ id: older.id }], nextCursor: null });
  });

  it("rolls back the post, subtype and log and removes a staged file after a failed write", async () => {
    deps.saveImage.mockResolvedValueOnce({
      storageKey: "bad-image.webp", url: "/media/bad-image.webp", mimeType: "x".repeat(51),
      sizeBytes: 1, width: 1, height: 1,
    });
    const response = await POST(multipart(roommate, { files: [image("bad")] }));
    expect(response.status).toBe(503);
    expect(await testDb.select().from(posts)).toEqual([]);
    expect(await testDb.select().from(roommatePosts)).toEqual([]);
    expect(await testDb.select().from(moderationLogs)).toEqual([]);
    expect(deps.removeImage).toHaveBeenCalledWith("bad-image.webp");
  });

  it("cleans previous files if a later upload fails", async () => {
    deps.saveImage.mockResolvedValueOnce({
      storageKey: "first.webp", url: "/media/first.webp", mimeType: "image/webp", sizeBytes: 1, width: 1, height: 1,
    }).mockRejectedValueOnce(new ForumError("VALIDATION_ERROR", "Ảnh không hợp lệ."));
    expect((await POST(multipart(roommate, { files: [image("one"), image("two")] }))).status).toBe(400);
    expect(await testDb.select().from(posts)).toEqual([]);
    expect(deps.removeImage).toHaveBeenCalledExactlyOnceWith("first.webp");
  });

  it("does not overwrite an edit committed while moderation was running", async () => {
    const original = await (await POST(multipart(roommate))).json();
    deps.moderate.mockImplementationOnce(async () => {
      await testDb.update(posts).set({ title: "Bản đã cập nhật" }).where(eq(posts.id, original.id));
      return approved;
    });
    const response = await PATCH(multipart({ ...roommate, title: "Bản đã cũ" }, { keepImageIds: [] }), idContext(original.id));
    expect(response.status).toBe(409);
    expect((await getPost(original.id))?.title).toBe("Bản đã cập nhật");
    expect(await testDb.select().from(moderationLogs)).toHaveLength(1);
  });

  it("requires ownership, rechecks moderation, then keeps and removes the right images", async () => {
    const original = await (await POST(multipart(roommate, { files: [image("one"), image("two")] }))).json();
    const [removed, kept] = await testDb.select().from(postImages).orderBy(postImages.sortOrder);
    const payload = { ...roommate, title: "Nội dung cập nhật" };
    deps.getActor.mockResolvedValueOnce(actors.other).mockResolvedValueOnce(actors.other);
    expect((await PATCH(multipart(payload, { keepImageIds: [kept.id] }), idContext(original.id))).status).toBe(403);
    expect((await DELETE(deleteRequest(), idContext(original.id))).status).toBe(403);
    expect((await PATCH(multipart(review, { keepImageIds: [] }), idContext(original.id))).status).toBe(400);

    deps.moderate.mockResolvedValueOnce({ result: "rejected", reason: "Bị từ chối" });
    expect((await PATCH(multipart(payload, { keepImageIds: [] }), idContext(original.id))).status).toBe(422);
    expect((await getPost(original.id))?.title).toBe(roommate.title);
    expect(deps.removeImage).not.toHaveBeenCalled();

    expect((await PATCH(multipart(payload, { keepImageIds: [9999] }), idContext(original.id))).status).toBe(400);
    const response = await PATCH(multipart(payload, { keepImageIds: [kept.id], files: [image("three")] }), idContext(original.id));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ title: payload.title, images: [{ id: kept.id }, { id: expect.any(Number) }] });
    expect(deps.removeImage).toHaveBeenCalledExactlyOnceWith(removed.storageKey);
    expect(await testDb.select().from(moderationLogs)).toHaveLength(2);
    expect((await DELETE(deleteRequest(), idContext(original.id))).status).toBe(200);
    expect(await getPost(original.id)).toBeNull();
    expect(await testDb.select().from(postImages)).toEqual([]);
    expect(await testDb.select().from(moderationLogs)).toHaveLength(2);
    expect(deps.removeImage).toHaveBeenCalledWith(kept.storageKey);
  });
});
