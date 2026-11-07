import { forumDependencies } from "../../../../server/forum/dependencies";
import { mutationById } from "../../../../server/forum/route";
import { readPostForm } from "../../../../server/posts/payload";
import { deletePost, updatePost } from "../../../../server/posts/service";

export const PATCH = mutationById(forumDependencies, async (request, actor, id) => {
  const { payload, images, keepImageIds } = await readPostForm(request, true);
  return Response.json(await updatePost(forumDependencies, actor, id, payload, images, keepImageIds));
});

export const DELETE = mutationById(forumDependencies, async (_request, actor, id) => {
  await deletePost(forumDependencies, actor, id);
  return Response.json({ ok: true });
});
