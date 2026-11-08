import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as start } from "../app/api/auth/google/route";
import { GET as callback } from "../app/api/auth/google/callback/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { getCurrentUser, requireAdmin, requireStudent, requireUser } from "../server/auth/service";
import { adminProfiles, sessions, universities, users } from "../server/db/schema";
import { forumDependencies } from "../server/forum/dependencies";
import { forumDatabase, hasTestDatabase, testDb } from "./fixtures/forum";

vi.mock("../server/db/client", async () => ({ db: (await import("./fixtures/forum")).testDb }));

const origin = "http://localhost:3000";
const google = "https://accounts.google.com";
const clientId = "sivi-fixture-client";
const callbackPath = "/api/auth/google/callback";
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...keys.publicKey.export({ format: "jwk" }), kid: "sivi-fixture-key", alg: "RS256", use: "sig" };
let tokenRequest: URLSearchParams | undefined;
let tokenClaims: Record<string, unknown>;
let breakSignature: boolean;

function idToken() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({ iss: google, aud: clientId, iat: now, exp: now + 300, ...tokenClaims });
  const input = encode({ alg: "RS256", kid: jwk.kid }) + "." + payload;
  const signature = sign("RSA-SHA256", Buffer.from(input), keys.privateKey);
  if (breakSignature) signature[0] ^= 1;
  return input + "." + signature.toString("base64url");
}

beforeEach(() => {
  vi.stubEnv("APP_URL", origin);
  vi.stubEnv("GOOGLE_CLIENT_ID", clientId);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("ADMIN_EMAILS", "");
  tokenClaims = { sub: "google-student", email: "student@gmail.com", email_verified: true, name: "Test Student" };
  tokenRequest = undefined;
  breakSignature = false;
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    switch (url.href) {
      case google + "/.well-known/openid-configuration":
        return Response.json({
          issuer: google,
          authorization_endpoint: google + "/authorize",
          token_endpoint: google + "/token",
          jwks_uri: google + "/jwks",
          id_token_signing_alg_values_supported: ["RS256"],
          code_challenge_methods_supported: ["S256"],
        });
      case google + "/token":
        tokenRequest = new URLSearchParams(String(init?.body));
        return Response.json({ access_token: "test-token", token_type: "Bearer", id_token: idToken() });
      case google + "/jwks":
        return Response.json({ keys: [jwk] });
      default:
        throw new Error("Unexpected OAuth endpoint");
    }
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function setCookie(response: Response, name: string) {
  return response.headers.getSetCookie().find((value) => value.startsWith(name + "="));
}

function cookiePair(response: Response, name: string) {
  return setCookie(response, name)?.split(";")[0] ?? "";
}

async function beginFlow() {
  const response = await start();
  expect(response.status).toBe(303);
  const authorization = new URL(response.headers.get("location")!);
  tokenClaims.nonce = authorization.searchParams.get("nonce");
  return {
    authorization,
    state: authorization.searchParams.get("state")!,
    cookie: cookiePair(response, "sivi_oauth"),
  };
}

function completeFlow(state: string, cookie: string, previousSession = "") {
  const url = new URL(callbackPath, "http://reverse-proxy.invalid");
  url.search = new URLSearchParams({ code: "fixture-code", state }).toString();
  return callback(new Request(url, { headers: { cookie: [cookie, previousSession].filter(Boolean).join("; ") } }));
}

function authenticated(cookie: string) {
  return new Request(origin, { headers: { cookie } });
}

function logoutRequest(cookie: string, requestOrigin = origin) {
  return new Request(origin + "/api/auth/logout", {
    method: "POST",
    headers: { cookie, origin: requestOrigin },
  });
}

describe("Google authorization boundary", () => {
  it("reports missing OAuth credentials without redirecting", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    expect((await start()).status).toBe(503);
  });

  it("sets an HTTPS host-only flow cookie and starts an OIDC request with PKCE", async () => {
    vi.stubEnv("APP_URL", "https://sivi.example");
    const response = await start();
    expect(response.status).toBe(303);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe(google);
    expect(location.searchParams.get("redirect_uri")).toBe("https://sivi.example" + callbackPath);
    expect(location.searchParams.get("scope")).toBe("openid email profile");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.searchParams.get("state")).toHaveLength(43);
    expect(location.searchParams.get("nonce")).toHaveLength(43);
    expect(setCookie(response, "__Host-sivi_oauth")).toMatch(/Secure/i);
    expect(setCookie(response, "__Host-sivi_oauth")).toMatch(/HttpOnly/i);
    expect(setCookie(response, "__Host-sivi_oauth")).toMatch(/SameSite=lax/i);
  });

  it("rejects a mismatched state before calling the token endpoint", async () => {
    const flow = await beginFlow();
    const response = await completeFlow("wrong-state", flow.cookie);
    expect(response.headers.get("location")).toBe(origin + "/?authError=google_login_failed");
    expect(setCookie(response, "sivi_session")).toBeUndefined();
    expect(setCookie(response, "sivi_oauth")).toMatch(/Max-Age=0/i);
    expect(tokenRequest).toBeUndefined();
  });

  it("rejects an expired flow before calling the token endpoint", async () => {
    const flow = await beginFlow();
    const value = flow.cookie.slice("sivi_oauth=".length);
    const transaction = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    transaction.expiresAt = Date.now() - 1;
    const expired = "sivi_oauth=" + Buffer.from(JSON.stringify(transaction)).toString("base64url");
    const response = await completeFlow(flow.state, expired);
    expect(response.headers.get("location")).toContain("authError=google_login_failed");
    expect(tokenRequest).toBeUndefined();
  });
});

describe.skipIf(!hasTestDatabase)("Google sessions with PostgreSQL", () => {
  forumDatabase();

  it("creates a guest session, uses the configured callback, and revokes it on logout", async () => {
    const flow = await beginFlow();
    const response = await completeFlow(flow.state, flow.cookie);
    expect(response.headers.get("location")).toBe(origin + "/");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(tokenRequest?.get("redirect_uri")).toBe(origin + callbackPath);
    const verifier = tokenRequest?.get("code_verifier");
    expect(verifier).toHaveLength(43);
    expect(createHash("sha256").update(verifier!).digest("base64url"))
      .toBe(flow.authorization.searchParams.get("code_challenge"));

    const cookie = cookiePair(response, "sivi_session");
    const token = cookie.slice("sivi_session=".length);
    expect(token).toHaveLength(43);
    expect(setCookie(response, "sivi_session")).toMatch(/HttpOnly/i);
    expect(setCookie(response, "sivi_session")).toMatch(/Max-Age=2592000/i);

    const stored = await testDb.select().from(sessions);
    expect(stored).toHaveLength(1);
    expect(stored[0].tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
    const request = authenticated(cookie);
    await expect(requireUser(request)).resolves.toMatchObject({
      email: "student@gmail.com", role: "guest", isVerified: false,
    });
    await expect(forumDependencies.getActor(request)).resolves.toMatchObject({ role: "guest" });
    await expect(requireStudent(request)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireAdmin(request)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getCurrentUser(authenticated(cookie + "; " + cookie))).resolves.toBeNull();

    expect((await logout(logoutRequest(cookie, "https://other.example"))).status).toBe(403);
    await expect(getCurrentUser(request)).resolves.toMatchObject({ role: "guest" });
    const result = await logout(logoutRequest(cookie));
    expect(result.status).toBe(200);
    expect(setCookie(result, "sivi_session")).toMatch(/Max-Age=0/i);
    expect(await testDb.select().from(sessions)).toHaveLength(0);
    await expect(requireUser(request)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("keeps a student's verified role on sign-in by sub and rotates the old session", async () => {
    const firstFlow = await beginFlow();
    const first = await completeFlow(firstFlow.state, firstFlow.cookie);
    const oldCookie = cookiePair(first, "sivi_session");
    const user = await requireUser(authenticated(oldCookie));
    const [university] = await testDb.select().from(universities);
    await testDb.update(users).set({
      role: "student", isVerified: true, universityId: university.id, universityEmail: "verified@school.test",
    }).where(eq(users.id, user.id));

    tokenClaims.email = "renamed@gmail.com";
    const flow = await beginFlow();
    const second = await completeFlow(flow.state, flow.cookie, oldCookie);
    const newCookie = cookiePair(second, "sivi_session");
    expect(newCookie).not.toBe(oldCookie);
    await expect(getCurrentUser(authenticated(oldCookie))).resolves.toBeNull();
    await expect(requireStudent(authenticated(newCookie))).resolves.toMatchObject({
      id: user.id, email: "renamed@gmail.com", universityEmail: "verified@school.test", isVerified: true,
    });

    await testDb.update(sessions).set({ expiresAt: new Date(Date.now() - 1_000) });
    await expect(getCurrentUser(authenticated(newCookie))).resolves.toBeNull();
  });

  it("refuses to link a different Google subject by email", async () => {
    const first = await beginFlow();
    expect((await completeFlow(first.state, first.cookie)).headers.get("location")).toBe(origin + "/");
    tokenClaims.sub = "different-google-subject";
    const second = await beginFlow();
    const response = await completeFlow(second.state, second.cookie);
    expect(response.headers.get("location")).toContain("authError=google_login_failed");
    expect(setCookie(response, "sivi_session")).toBeUndefined();
    expect(await testDb.select().from(sessions)).toHaveLength(1);
    expect(await testDb.select().from(users).where(eq(users.googleId, "different-google-subject"))).toEqual([]);
  });

  it.each(["signature", "nonce", "email_verified"])("refuses invalid Google %s", async (reason) => {
    const flow = await beginFlow();
    if (reason === "signature") breakSignature = true;
    if (reason === "nonce") tokenClaims.nonce = "wrong-nonce";
    if (reason === "email_verified") tokenClaims.email_verified = false;
    const response = await completeFlow(flow.state, flow.cookie);
    expect(response.headers.get("location")).toContain("authError=google_login_failed");
    expect(setCookie(response, "sivi_session")).toBeUndefined();
    expect(await testDb.select().from(sessions)).toEqual([]);
  });

  it("provisions allowlisted Google-managed admins but keeps third-party emails as guests", async () => {
    vi.stubEnv("ADMIN_EMAILS", " STUDENT@GMAIL.COM,third@example.test ");
    const flow = await beginFlow();
    const admin = await completeFlow(flow.state, flow.cookie);
    const user = await requireAdmin(authenticated(cookiePair(admin, "sivi_session")));
    expect(user.role).toBe("admin");
    expect(await testDb.select().from(adminProfiles)).toMatchObject([{ userId: user.id }]);

    tokenClaims = { ...tokenClaims, sub: "third-party-subject", email: "third@example.test" };
    const other = await beginFlow();
    const guest = await completeFlow(other.state, other.cookie);
    await expect(getCurrentUser(authenticated(cookiePair(guest, "sivi_session"))))
      .resolves.toMatchObject({ role: "guest" });
  });
});
