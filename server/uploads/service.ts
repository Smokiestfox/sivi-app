import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ForumError } from "../forum/errors";
import type { StoredImage } from "../forum/contracts";
import { getMaxUploadBytes } from "./limits";

const maxImageDimension = 1_600;
const maxInputPixels = 40_000_000;
const storageKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

function postImagesDirectory(): string {
  return path.resolve(process.cwd(), process.env.STORAGE_DIR || "./storage", "posts");
}

export function getPostImagePath(storageKey: string): string | null {
  if (!storageKeyPattern.test(storageKey)) return null;
  return path.join(postImagesDirectory(), storageKey);
}

function invalidImage(message = "Tệp phải là ảnh JPEG, PNG hoặc WebP hợp lệ.") {
  return new ForumError("VALIDATION_ERROR", message);
}

function errno(error: unknown): string | undefined {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined;
}

async function removeIfPresent(filePath: string) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (errno(error) !== "ENOENT") throw error;
  }
}

export async function saveImage(file: File): Promise<StoredImage> {
  const maxBytes = getMaxUploadBytes();
  if (file.size < 1 || file.size > maxBytes) {
    throw invalidImage(`Ảnh phải có dung lượng từ 1 byte đến ${maxBytes} byte.`);
  }

  let input: Buffer;
  try {
    input = Buffer.from(await file.arrayBuffer());
  } catch {
    throw invalidImage();
  }
  if (input.length !== file.size || input.length > maxBytes) throw invalidImage();

  let output: Buffer;
  let width: number;
  let height: number;
  try {
    const metadata = await sharp(input, { limitInputPixels: maxInputPixels }).metadata();
    if (
      !metadata.format
      || !["jpeg", "png", "webp"].includes(metadata.format)
      || !metadata.width
      || !metadata.height
      || metadata.pages && metadata.pages > 1
      || metadata.width * metadata.height > maxInputPixels
    ) {
      throw invalidImage();
    }

    const converted = await sharp(input, { limitInputPixels: maxInputPixels })
      .rotate()
      .resize({
        width: maxImageDimension,
        height: maxImageDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    output = converted.data;
    width = converted.info.width;
    height = converted.info.height;
  } catch (error) {
    if (error instanceof ForumError) throw error;
    throw invalidImage();
  }

  const storageKey = `${randomUUID()}.webp`;
  const directory = postImagesDirectory();
  const destination = path.join(directory, storageKey);
  const temporary = path.join(directory, `.${storageKey}.${randomUUID()}.tmp`);
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(temporary, output, { flag: "wx", mode: 0o600 });
    await rename(temporary, destination);
  } catch (error) {
    try {
      await removeIfPresent(temporary);
    } catch (cleanupError) {
      console.error("Could not clean incomplete image upload.", {
        name: cleanupError instanceof Error ? cleanupError.name : "UnknownError",
      });
    }
    console.error("Could not save uploaded image.", { name: error instanceof Error ? error.name : "UnknownError" });
    throw new ForumError("SERVICE_UNAVAILABLE", "Không thể lưu ảnh. Vui lòng thử lại sau.");
  }

  return {
    storageKey,
    url: `/media/posts/${storageKey}`,
    mimeType: "image/webp",
    sizeBytes: output.length,
    width,
    height,
  };
}

export async function removeImage(storageKey: string): Promise<void> {
  const filePath = getPostImagePath(storageKey);
  if (!filePath) throw new ForumError("VALIDATION_ERROR", "Storage key ảnh không hợp lệ.");

  try {
    await unlink(filePath);
  } catch (error) {
    if (errno(error) === "ENOENT") return;
    console.error("Could not remove stored image.", { name: error instanceof Error ? error.name : "UnknownError" });
    throw new ForumError("SERVICE_UNAVAILABLE", "Không thể xóa ảnh đã lưu.");
  }
}
