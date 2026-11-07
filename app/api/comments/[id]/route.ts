import { commentPayload, deleteComment, updateComment } from "../../../../server/comments/service";
import { forumDependencies } from "../../../../server/forum/dependencies";
import { readJson, validate } from "../../../../server/forum/mutation";
import { mutationById } from "../../../../server/forum/route";

export const PATCH = mutationById(forumDependencies, async (request, actor, id) => {
  const { content } = validate(commentPayload, await readJson(request));
  return Response.json(await updateComment(forumDependencies, actor, id, content));
});

export const DELETE = mutationById(forumDependencies, async (_request, actor, id) => {
  await deleteComment(actor, id);
  return Response.json({ ok: true });
});
