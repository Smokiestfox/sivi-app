import { commentPayload, createComment } from "../../../../../server/comments/service";
import { forumDependencies } from "../../../../../server/forum/dependencies";
import { readJson, validate } from "../../../../../server/forum/mutation";
import { mutationById } from "../../../../../server/forum/route";

export const POST = mutationById(forumDependencies, async (request, actor, id) => {
  const { content } = validate(commentPayload, await readJson(request));
  return Response.json(await createComment(forumDependencies, actor, id, content), { status: 201 });
});
