import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { adminProfiles, universities, universityDomains, users } from "../db/schema";
import type { ForumTransaction } from "../forum/contracts";

export const demoUniversities = [
  { name: "Đại học Bách khoa - ĐHQG TP.HCM", shortName: "HCMUT", domain: "hcmut.edu.vn" },
  { name: "Đại học Khoa học Tự nhiên - ĐHQG TP.HCM", shortName: "HCMUS", domain: "hcmus.edu.vn" },
  { name: "Đại học Công nghệ Thông tin - ĐHQG TP.HCM", shortName: "UIT", domain: "uit.edu.vn" },
] as const;

export type DemoRole = "guest" | "student" | "admin";

export async function ensureDemoUniversity(
  tx: ForumTransaction,
  university: (typeof demoUniversities)[number],
) {
  let [record] = await tx.select({ id: universities.id }).from(universities)
    .where(eq(universities.shortName, university.shortName)).limit(1);
  if (!record) {
    [record] = await tx.insert(universities).values({
      name: university.name,
      shortName: university.shortName,
    }).returning({ id: universities.id });
  }

  const [domain] = await tx.select({ id: universityDomains.id }).from(universityDomains)
    .where(eq(universityDomains.domain, university.domain)).limit(1);
  if (!domain) {
    await tx.insert(universityDomains).values({
      universityId: record.id,
      domain: university.domain,
      domainType: "student",
    });
  }
  return record.id;
}

export async function ensureDemoUser(tx: ForumTransaction, role: DemoRole) {
  const profile = {
    guest: { googleId: "demo:guest", email: "guest@demo.sivi.local", name: "Guest SiVi" },
    student: { googleId: "demo:student", email: "student@demo.sivi.local", name: "Sinh viên Demo" },
    admin: { googleId: "demo:admin", email: "admin@demo.sivi.local", name: "Admin SiVi" },
  }[role];
  const universityIds = new Map<string, number>();
  for (const university of demoUniversities) {
    universityIds.set(university.shortName, await ensureDemoUniversity(tx, university));
  }
  const student = role === "student" ? demoUniversities[1] : null;
  const universityId = student ? universityIds.get(student.shortName) : null;
  const [user] = await tx.insert(users).values({
    ...profile,
    role,
    isVerified: Boolean(student),
    universityId,
    universityEmail: student ? `demo@${student.domain}` : null,
  }).onConflictDoUpdate({
    target: users.googleId,
    set: {
      name: profile.name,
      role,
      isVerified: Boolean(student),
      universityId,
      universityEmail: student ? `demo@${student.domain}` : null,
      updatedAt: new Date(),
    },
  }).returning({ id: users.id });

  if (role === "admin") {
    await tx.insert(adminProfiles).values({ userId: user.id }).onConflictDoNothing();
  }
  return user;
}

export async function getDemoUser(role: DemoRole) {
  return db.transaction((tx) => ensureDemoUser(tx, role));
}
