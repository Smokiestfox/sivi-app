import { afterEach, describe, expect, it, vi } from "vitest";
import { moderate } from "../server/moderation/service";

afterEach(() => {
  vi.useRealTimers();
});

describe("demo moderation", () => {
  it("waits 4.5 seconds and approves ordinary content", async () => {
    vi.useFakeTimers();
    const result = moderate({ contentType: "post", title: "Tìm roommate", body: "Gần trường" });
    await vi.advanceTimersByTimeAsync(4_500);
    await expect(result).resolves.toMatchObject({
      result: "approved",
      modelVersion: "sivi-demo-moderation-v1",
    });
  });

  it("rejects the demo violation marker after the same delay", async () => {
    vi.useFakeTimers();
    const result = moderate({ contentType: "comment", title: "", body: "test_vi_pham" });
    await vi.advanceTimersByTimeAsync(4_500);
    await expect(result).resolves.toEqual({
      result: "rejected",
      reason: "Nội dung vi phạm tiêu chuẩn cộng đồng (giả lập)",
    });
  });
});
