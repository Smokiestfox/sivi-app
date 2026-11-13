import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, pool } from "../server/db/client";
import type { ForumTransaction } from "../server/forum/contracts";
import {
  posts,
  reviewPosts,
  roommatePosts,
  studentProfiles,
  universities,
  universityDomains,
  users,
} from "../server/db/schema";

const demoUniversities = [
  {
    name: "Trường Đại học Công nghệ Thông tin, ĐHQG-HCM",
    shortName: "UIT",
    domains: [
      { domain: "gm.uit.edu.vn", domainType: "student" as const },
      { domain: "uit.edu.vn", domainType: "staff" as const },
    ],
  },
  {
    name: "Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM",
    shortName: "HCMUS",
    domains: [{ domain: "hcmus.edu.vn", domainType: "student" as const }],
  },
] as const;

const demoStudents = [
  {
    key: "uit",
    googleId: "sivi-demo-uit-student",
    email: "demo.minhanh@gm.uit.edu.vn",
    name: "Nguyễn Minh Anh",
    universityShortName: "UIT",
    studentId: "UIT-DEMO-001",
    major: "Công nghệ thông tin",
    cohort: "K2023",
  },
  {
    key: "hcmus",
    googleId: "sivi-demo-hcmus-student",
    email: "demo.baongoc@hcmus.edu.vn",
    name: "Trần Bảo Ngọc",
    universityShortName: "HCMUS",
    studentId: "HCMUS-DEMO-001",
    major: "Khoa học dữ liệu",
    cohort: "K2023",
  },
] as const;

type RoommateSeed = {
  author: string;
  title: string;
  content: string;
  address: string;
} & Omit<typeof roommatePosts.$inferInsert, "postId" | "createdAt" | "updatedAt">;

const roommateSeeds = [
  {
    author: "uit",
    title: "Tìm bạn ở ghép gần cổng Khu Công nghệ Phần mềm",
    content: "Phòng sạch, có cửa sổ và chỗ để xe. Ưu tiên bạn ở gọn gàng, không hút thuốc; có thể dọn vào đầu tháng tới.",
    address: "Khu phố 6, phường Linh Trung, TP. Thủ Đức",
    rent: "3200000",
    peopleNeeded: 1,
    genderPreference: "any" as const,
    areaM2: "24",
    roommateRequirements: "Ưu tiên sinh viên, giữ vệ sinh không gian chung.",
    roomType: "shared" as const,
    district: "TP. Thủ Đức",
    amenities: ["Wi-Fi", "Máy giặt", "Chỗ để xe"],
    contactInfo: "demo.minhanh@gm.uit.edu.vn",
  },
  {
    author: "hcmus",
    title: "Tìm roommate nữ gần Đại học Quốc gia",
    content: "Căn hộ mini có bếp riêng, giờ giấc tự do. Đang cần thêm một bạn nữ ở lâu dài, tiền điện nước chia theo hóa đơn.",
    address: "Đường Tô Vĩnh Diện, TP. Dĩ An",
    rent: "2800000",
    peopleNeeded: 1,
    genderPreference: "female" as const,
    areaM2: "20",
    roommateRequirements: "Không hút thuốc, báo trước nếu có khách qua đêm.",
    roomType: "private" as const,
    district: "Dĩ An",
    amenities: ["Bếp riêng", "Wi-Fi", "Ban công"],
    contactInfo: "demo.baongoc@hcmus.edu.vn",
  },
] satisfies RoommateSeed[];

type ReviewSeed = {
  author: string;
  title: string;
  content: string;
  address: string;
} & Omit<typeof reviewPosts.$inferInsert, "postId" | "createdAt" | "updatedAt">;

const reviewSeeds = [
  {
    author: "uit",
    title: "Quán cà phê yên tĩnh để học nhóm gần làng đại học",
    content: "Quán có nhiều ổ cắm, bàn rộng và nhạc nhỏ. Buổi chiều hơi đông nhưng nhân viên thân thiện.",
    address: "Khu phố 6, phường Linh Trung, TP. Thủ Đức",
    placeName: "Cà phê Góc Nhỏ",
    placeType: "cafe" as const,
    referencePrice: "45000",
    rating: 4,
    experience: "Phù hợp ngồi học khoảng 2–3 tiếng; nên đến trước 17 giờ để dễ chọn chỗ.",
    priceRange: "medium" as const,
    wifiRating: 4,
    atmosphereRating: 5,
    serviceRating: 4,
  },
  {
    author: "hcmus",
    title: "Bữa trưa sinh viên ngon và vừa túi tiền",
    content: "Phần ăn đầy đặn, lên món nhanh. Có nhiều món cơm và món nước, phù hợp đi ăn cùng bạn học.",
    address: "Đường Nguyễn An Ninh, TP. Dĩ An",
    placeName: "Cơm Nhà Sinh Viên",
    placeType: "restaurant" as const,
    referencePrice: "35000",
    rating: 5,
    experience: "Mình gọi cơm gà và trà đá, khẩu phần ổn so với giá. Quán đông vào giờ nghỉ trưa.",
    priceRange: "low" as const,
    wifiRating: null,
    atmosphereRating: 4,
    serviceRating: 5,
  },
] satisfies ReviewSeed[];

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed the demo database.");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data in production.");
  }

  const universityIds = new Map<string, number>();
  const studentIds = new Map<string, number>();

  await db.transaction(async (tx) => {
    for (const university of demoUniversities) {
      const [existing] = await tx.select({ id: universities.id })
        .from(universities)
        .where(eq(universities.shortName, university.shortName))
        .limit(1);
      let universityId = existing?.id;

      if (universityId === undefined) {
        const [created] = await tx.insert(universities)
          .values({ name: university.name, shortName: university.shortName })
          .returning({ id: universities.id });
        universityId = created.id;
      } else {
        await tx.update(universities)
          .set({ name: university.name, updatedAt: new Date() })
          .where(eq(universities.id, universityId));
      }

      universityIds.set(university.shortName, universityId);
      for (const domain of university.domains) {
        await tx.insert(universityDomains)
          .values({ universityId, ...domain })
          .onConflictDoUpdate({
            target: universityDomains.domain,
            set: { universityId, domainType: domain.domainType, updatedAt: new Date() },
          });
      }
    }

    for (const student of demoStudents) {
      const universityId = universityIds.get(student.universityShortName);
      if (universityId === undefined) {
        throw new Error(`Missing seeded university: ${student.universityShortName}`);
      }

      const [user] = await tx.insert(users)
        .values({
          googleId: student.googleId,
          email: student.email,
          universityEmail: student.email,
          name: student.name,
          role: "student",
          isVerified: true,
          universityId,
          studentId: student.studentId,
        })
        .onConflictDoUpdate({
          target: users.googleId,
          set: {
            email: student.email,
            universityEmail: student.email,
            name: student.name,
            role: "student",
            isVerified: true,
            universityId,
            studentId: student.studentId,
            updatedAt: new Date(),
          },
        })
        .returning({ id: users.id });

      await tx.insert(studentProfiles)
        .values({ userId: user.id, major: student.major, cohort: student.cohort })
        .onConflictDoUpdate({
          target: studentProfiles.userId,
          set: { major: student.major, cohort: student.cohort, updatedAt: new Date() },
        });
      studentIds.set(student.key, user.id);
    }

    for (const { author, ...roommate } of roommateSeeds) {
      const authorId = studentIds.get(author);
      if (authorId === undefined) throw new Error(`Missing demo author: ${author}`);
      const { title, content, address, ...details } = roommate;
      const postId = await ensurePostWithTransaction(tx, authorId, "roommate", { title, content, address });
      await tx.insert(roommatePosts)
        .values({ postId, ...details })
        .onConflictDoUpdate({ target: roommatePosts.postId, set: { ...details, updatedAt: new Date() } });
    }

    for (const { author, ...review } of reviewSeeds) {
      const authorId = studentIds.get(author);
      if (authorId === undefined) throw new Error(`Missing demo author: ${author}`);
      const { title, content, address, ...details } = review;
      const postId = await ensurePostWithTransaction(tx, authorId, "review", { title, content, address });
      await tx.insert(reviewPosts)
        .values({ postId, ...details })
        .onConflictDoUpdate({ target: reviewPosts.postId, set: { ...details, updatedAt: new Date() } });
    }
  });

  console.info("Demo seed complete: 2 universities, 3 domains, 2 roommate posts, 2 reviews.");
}

async function ensurePostWithTransaction(
  tx: ForumTransaction,
  authorId: number,
  postType: "roommate" | "review",
  seed: { title: string; content: string; address: string },
) {
  const [existing] = await tx.select({ id: posts.id })
    .from(posts)
    .where(and(
      eq(posts.authorId, authorId),
      eq(posts.postType, postType),
      eq(posts.title, seed.title),
    ))
    .limit(1);

  if (!existing) {
    const [created] = await tx.insert(posts)
      .values({ ...seed, authorId, postType, status: "active" })
      .returning({ id: posts.id });
    return created.id;
  }

  await tx.update(posts)
    .set({ ...seed, status: "active", updatedAt: new Date() })
    .where(eq(posts.id, existing.id));
  return existing.id;
}

void seed()
  .catch((error: unknown) => {
    console.error("Demo seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
