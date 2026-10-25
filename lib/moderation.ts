import { HttpError } from '@/lib/http';

export interface ModerationResult {
  passed: boolean;
  reason?: string;
  flaggedKeywords?: string[];
}

export async function moderate(content: string, context: 'post' | 'comment'): Promise<ModerationResult> {
  const endpoint = process.env.AI_MODERATION_URL;
  if (!endpoint) throw new HttpError(503, 'Hệ thống đang bận, vui lòng thử lại sau');

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.AI_MODERATION_API_KEY
          ? { authorization: `Bearer ${process.env.AI_MODERATION_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({ content, context }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('AI moderation request failed:', error);
    throw new HttpError(503, 'Hệ thống đang bận, vui lòng thử lại sau');
  }

  if (!response.ok) {
    console.error(`AI moderation returned HTTP ${response.status}.`);
    throw new HttpError(503, 'Hệ thống đang bận, vui lòng thử lại sau');
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new HttpError(503, 'Hệ thống đang bận, vui lòng thử lại sau');
  }
  if (!result || typeof result !== 'object' || typeof (result as ModerationResult).passed !== 'boolean') {
    throw new HttpError(503, 'Hệ thống đang bận, vui lòng thử lại sau');
  }
  return result as ModerationResult;
}

export function rejectFlagged(result: ModerationResult): void {
  if (!result.passed) {
    throw new HttpError(422, result.reason || 'Nội dung chưa đáp ứng quy định cộng đồng.');
  }
}
