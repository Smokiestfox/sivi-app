import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { StoredImage } from "../forum/contracts";
import { ForumError } from "../forum/errors";
import { getPostImagePath } from "../uploads/service";

const completion = z.object({
  choices: z.tuple([z.object({
    finish_reason: z.literal("stop"),
    message: z.object({ content: z.string().trim().min(1) }),
  })]).rest(z.unknown()),
});

export async function describeImage(image: StoredImage): Promise<string> {
  try {
    const key = process.env.ALIBABA_API_KEY?.trim();
    const baseUrl = process.env.ALIBABA_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
    const path = getPostImagePath(image.storageKey);
    if (!key || !path) throw new Error("Image classifier configuration missing");

    const bytes = await readFile(path);
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3.7-flash",
        enable_thinking: false,
        messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: `data:image/webp;base64,${bytes.toString("base64")}` } },
          { type: "text", text: "Phân loại ảnh và mô tả mọi chi tiết nhìn thấy trong ảnh." },
        ] }],
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Alibaba HTTP ${response.status}`);
    return completion.parse(await response.json()).choices[0].message.content;
  } catch (error) {
    console.error("Image classification failed", { error: error instanceof Error ? error.name : "UnknownError" });
    throw new ForumError("SERVICE_UNAVAILABLE", "Không thể kiểm duyệt ảnh. Vui lòng thử lại sau.");
  }
}
