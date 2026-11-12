import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { StoredImage } from "../forum/contracts";
import { ForumError } from "../forum/errors";

const maxBytes = 5 * 1024 * 1024;
const formats = {
  "image/jpeg": { extension: "jpg", signature: (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", signature: (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/webp": { extension: "webp", signature: (bytes: Buffer) => bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" },
} as const;

const uploadDirectory = path.join(process.cwd(), "public", "uploads");

export async function saveImage(file: File): Promise<StoredImage> {
  if (!Object.hasOwn(formats, file.type) || file.size < 1 || file.size > maxBytes) {
    throw new ForumError("VALIDATION_ERROR", "Ảnh phải là JPEG, PNG hoặc WebP và không vượt quá 5 MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const format = formats[file.type as keyof typeof formats];
  if (!format.signature(bytes)) {
    throw new ForumError("VALIDATION_ERROR", "Định dạng ảnh không khớp với nội dung tệp.");
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new ForumError("VALIDATION_ERROR", "Không thể đọc nội dung ảnh.");
  }
  if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
    throw new ForumError("VALIDATION_ERROR", "Ảnh không hợp lệ.");
  }

  const storageKey = `${randomUUID()}.${format.extension}`;
  try {
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, storageKey), bytes, { flag: "wx" });
  } catch {
    throw new ForumError("SERVICE_UNAVAILABLE", "Không thể lưu ảnh lúc này. Vui lòng thử lại.");
  }

  return {
    storageKey,
    url: `/uploads/${storageKey}`,
    mimeType: file.type,
    sizeBytes: bytes.byteLength,
    width: metadata.width,
    height: metadata.height,
  };
}

export async function removeImage(storageKey: string): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(storageKey)) {
    throw new Error("Invalid upload storage key");
  }
  try {
    await unlink(path.join(uploadDirectory, storageKey));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}
