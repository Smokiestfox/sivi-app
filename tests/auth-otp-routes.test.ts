import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("../server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("../server/auth/otp", () => ({
  requestOtp: mocks.requestOtp,
  verifyOtp: mocks.verifyOtp,
}));

import { POST as requestOtpRoute } from "../app/api/auth/otp/request/route";
import { POST as verifyOtpRoute } from "../app/api/auth/otp/verify/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_URL", "http://localhost:3000");
  mocks.getCurrentUser.mockResolvedValue({ id: 7 });
  mocks.requestOtp.mockResolvedValue({ message: "sent", expiresInSeconds: 300 });
  mocks.verifyOtp.mockResolvedValue({ message: "verified", user: { id: 7, role: "student", isVerified: true } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function request(path: string, body: unknown, origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("OTP endpoints", () => {
  it("requests a code using the server-session user", async () => {
    const req = request("/api/auth/otp/request", { email: "student@uit.edu.vn" });
    const response = await requestOtpRoute(req);

    expect(mocks.getCurrentUser).toHaveBeenCalledWith(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.requestOtp).toHaveBeenCalledWith(7, { email: "student@uit.edu.vn" });
  });

  it("verifies the supplied code for the server-session user", async () => {
    const response = await verifyOtpRoute(request("/api/auth/otp/verify", {
      email: "student@uit.edu.vn",
      otp: "123456",
    }));

    expect(response.status).toBe(200);
    expect(mocks.verifyOtp).toHaveBeenCalledWith(7, { email: "student@uit.edu.vn", otp: "123456" });
  });

  it("rejects cross-origin calls before checking session or executing auth", async () => {
    const response = await requestOtpRoute(request(
      "/api/auth/otp/request",
      { email: "student@uit.edu.vn" },
      "https://untrusted.example",
    ));

    expect(response.status).toBe(403);
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.requestOtp).not.toHaveBeenCalled();
  });

  it("requires a logged-in user", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const req = request("/api/auth/otp/request", { email: "student@uit.edu.vn" });
    const response = await requestOtpRoute(req);

    expect(mocks.getCurrentUser).toHaveBeenCalledWith(req);

    expect(response.status).toBe(401);
    expect(mocks.requestOtp).not.toHaveBeenCalled();
  });
});
