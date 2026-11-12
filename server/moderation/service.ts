import type { ModerationDecision, ModerationInput } from "../forum/contracts";

const simulatedRejection = "Nội dung vi phạm tiêu chuẩn cộng đồng (giả lập)";

export async function moderate(input: ModerationInput): Promise<ModerationDecision> {
  await new Promise<void>((resolve) => setTimeout(resolve, 4_500));

  if (`${input.title}\n${input.body}`.includes("test_vi_pham")) {
    return { result: "rejected", reason: simulatedRejection };
  }

  return {
    result: "approved",
    needsReview: false,
    tags: [],
    scores: { simulated: 1 },
    modelVersion: "sivi-demo-moderation-v1",
    policyVersion: "sivi-demo-policy-v1",
  };
}
