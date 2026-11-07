import type { ForumActor, ForumDependencies } from "./contracts";
import { mutation, parseId } from "./mutation";

type IdContext = { params: Promise<{ id: string }> };

export function mutationById(
  deps: ForumDependencies,
  run: (request: Request, actor: ForumActor, id: number) => Promise<Response>,
) {
  return (request: Request, { params }: IdContext) =>
    mutation(deps, async (request, actor) => run(request, actor, parseId((await params).id)))(request);
}
