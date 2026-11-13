import { readFile } from "node:fs/promises";
import { getPostImagePath } from "../../../../server/uploads/service";

export const runtime = "nodejs";

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  const filePath = getPostImagePath(key);
  if (!filePath) return new Response(null, { status: 404 });

  try {
    const image = await readFile(filePath);
    return new Response(new Uint8Array(image), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (isMissingFile(error)) return new Response(null, { status: 404 });
    console.error("Could not read stored image.", { name: error instanceof Error ? error.name : "UnknownError" });
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
