import { NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('Request failed:', error);
  return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new HttpError(400, 'Dữ liệu gửi lên không hợp lệ.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Dữ liệu gửi lên không hợp lệ.');
  }
  return value as Record<string, unknown>;
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new HttpError(503, 'APP_URL chưa được cấu hình trên máy chủ.');
  let matches = false;
  try {
    matches = Boolean(appUrl && origin && new URL(origin).origin === new URL(appUrl).origin);
  } catch {
    matches = false;
  }
  if (!matches) {
    throw new HttpError(403, 'Yêu cầu không hợp lệ. Hãy tải lại trang và thử lại.');
  }
}

export function boundedString(
  value: unknown,
  label: string,
  maximum: number,
  required = true,
): string {
  if (typeof value !== 'string') throw new HttpError(400, `${label} không hợp lệ.`);
  const trimmed = value.trim();
  if ((required && !trimmed) || trimmed.length > maximum) {
    throw new HttpError(400, `${label} phải có từ 1 đến ${maximum} ký tự.`);
  }
  return trimmed;
}

export function stringArray(
  value: unknown,
  label: string,
  maximum: number,
  itemMaximum = 100,
): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum || value.some((item) => typeof item !== 'string')) {
    throw new HttpError(400, `${label} không hợp lệ.`);
  }
  const items = value.map((item) => item.trim()).filter(Boolean);
  if (items.some((item) => item.length > itemMaximum)) {
    throw new HttpError(400, `${label} có mục quá dài.`);
  }
  return items;
}
