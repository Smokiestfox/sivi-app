import { randomUUID } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { query } from '@/lib/db';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

function redirectWithError(request: NextRequest, code: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/?authError=${code}`, request.url));
  response.cookies.delete('sivi_oauth_state');
  response.cookies.delete('sivi_oauth_nonce');
  return response;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const oauthError = request.nextUrl.searchParams.get('error');
  const cookies = request.cookies;
  const stateCookie = cookies.get('sivi_oauth_state')?.value;
  const nonce = cookies.get('sivi_oauth_nonce')?.value;

  if (!appUrl || !clientId || !clientSecret) return redirectWithError(request, 'not_configured');
  if (oauthError || !code || !state || !stateCookie || state !== stateCookie || !nonce) {
    return redirectWithError(request, 'oauth_failed');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: new URL('/api/auth/google/callback', appUrl).toString(),
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!tokenResponse.ok) return redirectWithError(request, 'oauth_failed');

    const tokens = (await tokenResponse.json()) as { id_token?: string };
    if (!tokens.id_token) return redirectWithError(request, 'oauth_failed');
    const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    });
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    const name = typeof payload.name === 'string' ? payload.name : email;
    const googleId = typeof payload.sub === 'string' ? payload.sub : '';
    const avatar = typeof payload.picture === 'string' ? payload.picture : null;
    if (payload.nonce !== nonce || payload.email_verified !== true || !email || !googleId) {
      return redirectWithError(request, 'oauth_failed');
    }

    const admins = new Set(
      (process.env.ADMIN_EMAILS ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean),
    );
    const role = admins.has(email) ? 'admin' : 'guest';
    const user = await query<{ id: string }>(
      `INSERT INTO users (id, google_id, email, name, avatar, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (google_id) DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         avatar = EXCLUDED.avatar,
         role = CASE
           WHEN EXCLUDED.role = 'admin' THEN 'admin'
           WHEN users.role = 'admin' AND users.is_verified THEN 'student'
           WHEN users.role = 'admin' THEN 'guest'
           ELSE users.role
         END
       RETURNING id`,
      [randomUUID(), googleId, email, name, avatar, role],
    );
    const sessionToken = await createSession(user.rows[0].id);
    const response = NextResponse.redirect(new URL('/', appUrl));
    response.cookies.set('sivi_session', sessionToken, {
      httpOnly: true,
      secure: appUrl.startsWith('https://'),
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.delete('sivi_oauth_state');
    response.cookies.delete('sivi_oauth_nonce');
    return response;
  } catch (error) {
    console.error('Google OAuth callback failed:', error);
    return redirectWithError(request, 'oauth_failed');
  }
}
