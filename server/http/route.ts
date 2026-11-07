import { jsonError } from "./errors";

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (request: Request, context: RouteContext) => Promise<Response>;

export function route(handler: Handler) {
  return async (request: Request, context: RouteContext) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return jsonError(error);
    }
  };
}
