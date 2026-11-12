export function validAuthOrigin(request: Request) {
  try {
    const expected = new URL(process.env.APP_URL ?? request.url).origin;
    return request.headers.get("origin") === expected;
  } catch {
    return false;
  }
}

export function authJson(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readAuthJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new Error("INVALID_CONTENT_TYPE");
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > 8_192) throw new Error("PAYLOAD_TOO_LARGE");
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }
}
