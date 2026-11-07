export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "REQUEST_ERROR",
  ) {
    super(message);
  }
}

export function jsonError(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error("Request failed:", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Đã xảy ra lỗi hệ thống." } },
    { status: 500 },
  );
}
