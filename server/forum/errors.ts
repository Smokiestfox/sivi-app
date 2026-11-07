const statuses = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  MODERATION_REJECTED: 422,
  SERVICE_UNAVAILABLE: 503,
};

export class ForumError extends Error {
  constructor(
    public readonly code: keyof typeof statuses,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }

  toResponse() {
    return Response.json({
      error: { code: this.code, message: this.message, fields: this.fields },
    }, { status: statuses[this.code] });
  }
}
