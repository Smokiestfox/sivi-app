import { connection } from 'next/server';
import { jsonError } from '@/lib/http';

export function route(
  action: (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>,
) {
  return async (request: Request, context: { params: Promise<Record<string, string>> }) => {
    await connection();
    try {
      return await action(request, context);
    } catch (error) {
      return jsonError(error);
    }
  };
}
