import { describe, expect, it } from "vitest";
import { GET } from "../app/api/health/route";

describe("GET /api/health", () => {
  it("reports that the web service is running", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: "sivi-web",
    });
  });
});
