import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import * as schema from "../../server/db/schema";
import type { ForumActor, ForumDependencies, ModerationDecision } from "../../server/forum/contracts";

export const hasTestDatabase = Boolean(process.env.SIVI_TEST_DATABASE_URL);
const namespace = "forum_test_" + randomUUID().replaceAll("-", "");
export const testPool = new Pool({
  connectionString: process.env.SIVI_TEST_DATABASE_URL,
  options: "-c search_path=" + namespace,
});
export const testDb = drizzle(testPool, { schema });

export const actors: { student: ForumActor; other: ForumActor } = {
  student: { id: 1, role: "student", isVerified: true },
  other: { id: 2, role: "student", isVerified: true },
};

export const approved = {
  result: "approved", needsReview: true, tags: ["review"], scores: { violence: 0.1 },
  modelVersion: "fixture-model", policyVersion: "fixture-policy",
} satisfies ModerationDecision;

export const deps = {
  getActor: vi.fn<ForumDependencies["getActor"]>(),
  moderate: vi.fn<ForumDependencies["moderate"]>(),
  saveImage: vi.fn<ForumDependencies["saveImage"]>(),
  removeImage: vi.fn<ForumDependencies["removeImage"]>(),
};

const origin = "http://localhost:3000";
export const roommate = {
  type: "roommate", title: "Tìm bạn cùng phòng", content: "Phòng gần trường.",
  address: "Khu phố 6", district: "Thủ Đức", rent: 2_000_000, roomType: "shared",
  peopleNeeded: 2, amenities: ["Máy lạnh"], contactInfo: "Email sinh viên",
  roommateRequirements: "Giữ yên tĩnh",
} as const;

export const review = {
  type: "review", title: "Cà phê gần trường", content: "Quán yên tĩnh.",
  placeName: "Cafe A", placeType: "cafe", rating: 4, priceRange: "medium",
} as const;

export function jsonRequest(body: unknown, method = "POST", requestOrigin = origin) {
  return new Request(origin + "/api", {
    method,
    headers: { origin: requestOrigin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function multipart(
  payload: unknown,
  options: { files?: File[]; keepImageIds?: number[] } = {},
) {
  const body = new FormData();
  body.set("payload", JSON.stringify(payload));
  for (const image of options.files ?? []) body.append("images", image);
  if (options.keepImageIds !== undefined) body.set("keepImageIds", JSON.stringify(options.keepImageIds));
  return new Request(origin + "/api", {
    method: options.keepImageIds === undefined ? "POST" : "PATCH",
    headers: { origin },
    body,
  });
}

export function idContext(id: number | string) {
  return { params: Promise.resolve({ id: String(id) }) };
}

export function deleteRequest() {
  return new Request(origin + "/api", { method: "DELETE", headers: { origin } });
}

export function forumMocks() {
  beforeEach(() => {
    vi.stubEnv("APP_URL", origin);
    deps.getActor.mockReset().mockImplementation(async () => actors.student);
    deps.moderate.mockReset().mockResolvedValue(approved);
    deps.saveImage.mockReset().mockImplementation(async (file) => {
      const key = randomUUID() + ".webp";
      return { storageKey: key, url: "/media/posts/" + key, mimeType: "image/webp", sizeBytes: file.size, width: 10, height: 10 };
    });
    deps.removeImage.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllEnvs());
}

export function forumDatabase() {
  beforeAll(async () => {
    await testPool.query('create schema "' + namespace + '"');
    const folder = path.join(process.cwd(), "server", "db", "migrations");
    const files = (await readdir(folder)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const sql = await readFile(path.join(folder, file), "utf8");
      await testPool.query(sql.replaceAll('"public".', '"' + namespace + '".'));
    }
  });

  beforeEach(async () => {
    await testPool.query("truncate users, universities, moderation_logs restart identity cascade");
    const [{ id: universityId }] = await testDb.insert(schema.universities)
      .values({ name: "Đại học kiểm thử", shortName: "TEST" }).returning({ id: schema.universities.id });
    const rows = await testDb.insert(schema.users).values(
      ["one", "two"].map((name) => ({
        googleId: name, email: name + "@example.test", universityEmail: name + "@school.test",
        name, universityId, role: "student" as const, isVerified: true,
      })),
    ).returning({ id: schema.users.id });
    actors.student.id = rows[0].id;
    actors.other.id = rows[1].id;
  });

  afterAll(async () => {
    try {
      await testPool.query('drop schema if exists "' + namespace + '" cascade');
    } finally {
      await testPool.end();
    }
  });
}
