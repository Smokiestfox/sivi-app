import { forumDependencies } from "../../../server/forum/dependencies";
import { mutation } from "../../../server/forum/mutation";
import { readPostForm } from "../../../server/posts/payload";
import { createPost } from "../../../server/posts/service";

export const POST = mutation(forumDependencies, async (request, actor) => {
  const { payload, images } = await readPostForm(request);
  return Response.json(await createPost(forumDependencies, actor, payload, images), { status: 201 });
});
