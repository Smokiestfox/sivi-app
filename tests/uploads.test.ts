import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/media/posts/[key]/route";
import { removeImage, saveImage } from "../server/uploads/service";

let storageDirectory: string;

beforeEach(async () => {
  storageDirectory = await mkdtemp(path.join(os.tmpdir(), "sivi-upload-test-"));
  vi.stubEnv("STORAGE_DIR", storageDirectory);
  vi.stubEnv("MAX_UPLOAD_BYTES", "5242880");
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(storageDirectory, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function imageFile(content: Uint8Array, type = "image/png") {
  const bytes = new Uint8Array(content.byteLength);
  bytes.set(content);
  return new File([bytes.buffer], "source.png", { type });
}

describe("post image storage", () => {
  it("validates real image bytes, normalizes to WebP and serves the returned URL", async () => {
    const png = await sharp({
      create: { width: 2_000, height: 1_000, channels: 3, background: { r: 80, g: 120, b: 200 } },
    }).png().toBuffer();

    const image = await saveImage(imageFile(new Uint8Array(png), "text/plain"));

    expect(image).toMatchObject({
      storageKey: expect.stringMatching(/^[0-9a-f-]{36}\.webp$/),
      url: `/media/posts/${image.storageKey}`,
      mimeType: "image/webp",
      width: 1_600,
      height: 800,
    });
    const storedPath = path.join(storageDirectory, "posts", image.storageKey);
    const storedBytes = await readFile(storedPath);
    expect((await sharp(storedBytes).metadata()).format).toBe("webp");
    expect(image.sizeBytes).toBe(storedBytes.byteLength);

    const response = await GET(new Request(`http://localhost:3000${image.url}`), {
      params: Promise.resolve({ key: image.storageKey }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(storedBytes);
  });

  it("rejects forged image content and configured oversized files", async () => {
    await expect(saveImage(imageFile(new TextEncoder().encode("not an image"))))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } },
    }).png().toBuffer();
    vi.stubEnv("MAX_UPLOAD_BYTES", "3");
    await expect(saveImage(imageFile(new Uint8Array(png))))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(readdir(path.join(storageDirectory, "posts"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("removes stored files idempotently and rejects unsafe keys", async () => {
    const png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 20, b: 30 } },
    }).png().toBuffer();
    const image = await saveImage(imageFile(new Uint8Array(png)));

    await removeImage(image.storageKey);
    await expect(removeImage(image.storageKey)).resolves.toBeUndefined();
    await expect(removeImage("../outside.webp")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const response = await GET(new Request(`http://localhost:3000${image.url}`), {
      params: Promise.resolve({ key: image.storageKey }),
    });
    expect(response.status).toBe(404);
  });

  it("does not serve malformed keys or files that do not exist", async () => {
    const invalid = await GET(new Request("http://localhost:3000/media/posts/../../secret"), {
      params: Promise.resolve({ key: "../../secret" }),
    });
    const missing = await GET(new Request("http://localhost:3000/media/posts/00000000-0000-0000-0000-000000000000.webp"), {
      params: Promise.resolve({ key: "00000000-0000-0000-0000-000000000000.webp" }),
    });
    expect(invalid.status).toBe(404);
    expect(missing.status).toBe(404);
  });
});
