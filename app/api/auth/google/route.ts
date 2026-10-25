import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { APP_URL, GOOGLE_CLIENT_ID } = process.env;
  if (!APP_URL || !GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(new URL('/?authError=not_configured', request.url));
  }

  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const callback = new URL('/api/auth/google/callback', APP_URL).toString();
  const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorization.search = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: callback,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    prompt: 'select_account',
  }).toString();

  const response = NextResponse.redirect(authorization);
  const secure = APP_URL.startsWith('https://');
  response.cookies.set('sivi_oauth_state', state, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  response.cookies.set('sivi_oauth_nonce', nonce, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return response;
}
