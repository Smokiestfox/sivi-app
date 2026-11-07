import { z } from "zod";
import { forumDependencies } from "../../../../../server/forum/dependencies";
import { readJson, validate } from "../../../../../server/forum/mutation";
import { mutationById } from "../../../../../server/forum/route";
import { vote } from "../../../../../server/votes/service";

const votePayload = z.strictObject({ value: z.literal([-1, 1]) });

export const POST = mutationById(forumDependencies, async (request, actor, id) => {
  const { value } = validate(votePayload, await readJson(request));
  return Response.json(await vote(actor, id, value));
});
