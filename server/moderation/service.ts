import { z } from "zod";
import type { ModerationDecision, ModerationInput } from "../forum/contracts";
import { ForumError } from "../forum/errors";
import { criteria } from "./criteria";

const policyVersion = "moderation-v1";
const model = "multilingual";
const answer = z.object({
  type: z.literal("choice"),
  probabilities: z.record(z.string(), z.number().min(0).max(1)),
});
const response = z.object({
  model: z.string().trim().min(1).max(80),
  routing: z.object({ model: z.literal(model) }),
  answers: z.object({
    violence: answer,
    sex: answer,
    ragebait: answer,
    review: answer,
    ask: answer,
  }),
  usage: z.object({
    truncated: z.boolean(),
    state_tokens_dropped: z.number().int().nonnegative(),
    truncated_questions: z.array(z.string()),
  }),
});

const tags = Object.keys(criteria) as (keyof typeof criteria)[];
const questions = Object.fromEntries(tags.map((tag) => [tag, criteria[tag].question]));
const rejectionReasons = {
  violence: "Nội dung có dấu hiệu đe dọa, kích động hoặc mô tả bạo lực nghiêm trọng.",
  sex: "Nội dung có dấu hiệu vi phạm quy định về nội dung tình dục.",
};

export async function moderate(input: ModerationInput): Promise<ModerationDecision> {
  const startedAt = Date.now();
  const context = { contentType: input.contentType, postId: input.postId, commentId: input.commentId, policyVersion };
  try {
    const baseUrl = process.env.LAYA_URL;
    const key = process.env.LAYA_API_KEY?.trim();
    if (!baseUrl || !key) throw new Error("Laya configuration missing");

    const endpoint = new URL("/v1/systemone", baseUrl);
    const signal = AbortSignal.timeout(10_000);
    const scores = { violence: 0, sex: 0, ragebait: 0, review: 0, ask: 0 };
    let modelVersion = "";
    // Overlap adjacent windows so a phrase crossing a split is still evaluated together.
    const body = Array.from([
      input.body,
      ...(input.imageDescriptions ?? []).map((description, index) => `[Mô tả ảnh ${index + 1}]\n${description}`),
    ].join("\n\n"));
    const windowSize = 1000;
    const overlap = 200;
    for (let start = 0; ; start += windowSize - overlap) {
      const result = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_len: 2048,
          state: { title: input.title, body: body.slice(start, start + windowSize).join("") },
          questions,
        }),
        cache: "no-store",
        redirect: "error",
        signal,
      });
      if (!result.ok) throw new Error(`Laya HTTP ${result.status}`);
      const parsed = response.safeParse(await result.json());
      if (!parsed.success) throw new Error("Invalid Laya response");
      const { answers, usage } = parsed.data;
      if (usage.truncated || usage.state_tokens_dropped || usage.truncated_questions.length) {
        throw new Error("Laya truncated moderation input");
      }
      modelVersion = `${parsed.data.model}:${model}`;
      for (const tag of tags) {
        const { match, other } = criteria[tag];
        const probabilities = answers[tag].probabilities;
        const positive = probabilities[match];
        const negative = probabilities[other];
        if (positive === undefined || negative === undefined || Math.abs(positive + negative - 1) >= 0.001) {
          throw new Error("Invalid Laya choice probabilities");
        }
        scores[tag] = Math.max(scores[tag], positive);
      }
      if (start + windowSize >= body.length) break;
    }

    const rejected = (["violence", "sex"] as const).find((tag) => scores[tag] >= 0.9);
    if (rejected) {
      console.info("Moderation rejected", { ...context, modelVersion, tag: rejected, score: scores[rejected], latencyMs: Date.now() - startedAt });
      return { result: "rejected", reason: rejectionReasons[rejected] };
    }

    return {
      result: "approved",
      needsReview: scores.violence > 0.15 || scores.sex > 0.15 || scores.ragebait >= 0.5,
      tags: tags.filter((tag) => scores[tag] >= 0.5),
      scores,
      modelVersion,
      policyVersion,
    };
  } catch (error) {
    console.error("Moderation unavailable", { ...context, error: error instanceof Error ? error.name : "UnknownError", latencyMs: Date.now() - startedAt });
    throw new ForumError("SERVICE_UNAVAILABLE", "Hệ thống đang bận. Vui lòng thử lại sau.");
  }
}

