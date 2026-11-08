import { z } from "zod";
import { assertStudent as requireStudent } from "../auth/guards";
import type { ForumActor, ForumDependencies, ModerationInput } from "./contracts";
import { ForumError } from "./errors";

export { requireStudent };

export const positiveId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const pathId = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(positiveId);
const moderationDecision = z.discriminatedUnion("result", [
  z.object({ result: z.literal("rejected"), reason: z.string().trim().min(1).max(1_000) }),
  z.object({
    result: z.literal("approved"),
    needsReview: z.boolean(),
    tags: z.array(z.string()),
    scores: z.record(z.string(), z.number().min(0).max(1)),
    modelVersion: z.string().trim().min(1).max(100),
    policyVersion: z.string().trim().min(1).max(50),
  }),
]);

export function parseId(value: string) {
  return validate(pathId, value);
}

export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;

  const fields: Record<string, string> = Object.create(null);
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "payload";
    if (!(key in fields)) fields[key] = issue.message;
  }
  throw new ForumError("VALIDATION_ERROR", "Dữ liệu không hợp lệ.", fields);
}

export async function approve(deps: ForumDependencies, input: ModerationInput) {
  const parsed = moderationDecision.safeParse(await deps.moderate(input));
  if (!parsed.success) {
    throw new ForumError("SERVICE_UNAVAILABLE", "Dịch vụ kiểm duyệt chưa sẵn sàng.");
  }
  const decision = parsed.data;
  if (decision.result === "rejected") {
    throw new ForumError("MODERATION_REJECTED", decision.reason);
  }

  return {
    result: decision.result,
    needsReview: decision.needsReview,
    labels: { ...decision.scores, tags: decision.tags },
    modelVersion: decision.modelVersion,
    policyVersion: decision.policyVersion,
  };
}

export function mutation(
  deps: ForumDependencies,
  run: (request: Request, actor: ForumActor) => Promise<Response>,
) {
  return async (request: Request) => {
    try {
      const appUrl = process.env.APP_URL ?? (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");
      if (!appUrl) throw new ForumError("SERVICE_UNAVAILABLE", "Ứng dụng chưa được cấu hình.");
      const origin = new URL(appUrl).origin;
      if (request.headers.get("origin") !== origin) {
        throw new ForumError("FORBIDDEN", "Nguồn yêu cầu không hợp lệ.");
      }
      const actor = requireStudent(await deps.getActor(request));
      return await run(request, actor);
    } catch (error) {
      if (error instanceof ForumError) return error.toResponse();

      console.error("Forum mutation failed", error instanceof Error ? error.name : "UnknownError");
      return new ForumError("SERVICE_UNAVAILABLE", "Hệ thống đang bận. Vui lòng thử lại sau.").toResponse();
    }
  };
}

export function boundedBody(request: Request, limit: number) {
  const tooLarge = () => new ForumError("PAYLOAD_TOO_LARGE", "Nội dung gửi lên vượt giới hạn.");
  if (Number(request.headers.get("content-length")) > limit) throw tooLarge();

  let received = 0;
  const stream = request.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > limit) throw tooLarge();
      controller.enqueue(chunk);
    },
  }));
  return new Response(stream, { headers: request.headers });
}

export async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ForumError("VALIDATION_ERROR", "Yêu cầu phải gửi dưới dạng JSON.");
  }
  try {
    return await boundedBody(request, 32 * 1024).json();
  } catch (error) {
    if (error instanceof ForumError) throw error;
    throw new ForumError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }
}
