import * as oidc from "openid-client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ForumError } from "../forum/errors";
import { authCookie, authOrigin, readAuthCookie } from "./config";
import { createGoogleSession, sessionCookie, type GoogleProfile } from "./service";

const issuer = new URL("https://accounts.google.com");
const callbackPath = "/api/auth/google/callback";
const flowSeconds = 10 * 60;
const flowValue = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const flowSchema = z.object({
  state: flowValue,
  nonce: flowValue,
  verifier: flowValue,
  expiresAt: z.number().int(),
});
const claimsSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().max(254),
  email_verified: z.literal(true),
  name: z.string().optional(),
  picture: z.string().optional(),
  hd: z.string().trim().min(1).optional(),
});
const avatarSchema = z.url({ protocol: /^https$/ }).max(2_048);

let configuration: Promise<oidc.Configuration> | undefined;

function googleConfiguration() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new ForumError("SERVICE_UNAVAILABLE", "Đăng nhập Google chưa được cấu hình.");
  }

  configuration ??= oidc.discovery(issuer, clientId, clientSecret, undefined, {
    timeout: 10,
    execute: [oidc.enableNonRepudiationChecks],
  }).then((config) => {
    config.timeout = 10;
    return config;
  }).catch((error: unknown) => {
    configuration = undefined;
    throw error;
  });

  return configuration;
}

function redirect(location: URL) {
  const response = NextResponse.redirect(location, 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function readFlow(request: Request, origin: string) {
  const value = readAuthCookie(request.headers.get("cookie"), authCookie(origin, "sivi_oauth", 0).name);
  if (!value || value.length > 512) return null;
  try {
    const parsed = flowSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    if (parsed.success && parsed.data.expiresAt > Date.now()) return parsed.data;
  } catch {
    // Missing, malformed and expired flows all require a new login.
  }
  return null;
}

function googleProfile(claims: unknown): GoogleProfile {
  const parsed = claimsSchema.safeParse(claims);
  if (!parsed.success) throw new Error("Invalid Google profile claims");

  const { sub, email, name, picture, hd } = parsed.data;
  const avatar = avatarSchema.safeParse(picture);
  return {
    googleId: sub,
    email: email.toLowerCase(),
    name: Array.from(name?.trim() || email).slice(0, 200).join(""),
    avatarUrl: avatar.success ? avatar.data : null,
    hostedDomain: hd,
  };
}

export async function startGoogleLogin() {
  const origin = authOrigin();
  const config = await googleConfiguration();
  const flow = {
    state: oidc.randomState(),
    nonce: oidc.randomNonce(),
    verifier: oidc.randomPKCECodeVerifier(),
    expiresAt: Date.now() + flowSeconds * 1000,
  };

  const location = oidc.buildAuthorizationUrl(config, {
    redirect_uri: new URL(callbackPath, origin).href,
    scope: "openid email profile",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(flow.verifier),
    code_challenge_method: "S256",
  });

  const response = redirect(location);
  response.cookies.set({
    ...authCookie(origin, "sivi_oauth", flowSeconds),
    value: Buffer.from(JSON.stringify(flow)).toString("base64url"),
  });
  return response;
}

export async function finishGoogleLogin(request: Request) {
  const origin = authOrigin();
  const home = new URL("/", origin);
  const flow = readFlow(request, origin);
  let token: string | undefined;

  if (flow) {
    try {
      const callback = new URL(callbackPath, origin);
      callback.search = new URL(request.url).search;
      const tokens = await oidc.authorizationCodeGrant(await googleConfiguration(), callback, {
        expectedState: flow.state,
        expectedNonce: flow.nonce,
        pkceCodeVerifier: flow.verifier,
      });
      token = await createGoogleSession(googleProfile(tokens.claims()), request, origin);
    } catch (error) {
      console.error("Google login failed", error instanceof Error ? error.name : "UnknownError");
    }
  }

  if (!token) home.searchParams.set("authError", "google_login_failed");
  const response = redirect(home);
  response.cookies.set({ ...authCookie(origin, "sivi_oauth", 0), value: "" });
  if (token) response.cookies.set({ ...sessionCookie(origin), value: token });
  return response;
}
