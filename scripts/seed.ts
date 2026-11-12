import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "../server/db/client";
import { demoUniversities, ensureDemoUniversity, ensureDemoUser } from "../server/auth/demo";
import {
  comments,
  moderationLogs,
  posts,
  reviewPosts,
  roommatePosts,
} from "../server/db/schema";

const roommates = [
  {
    title: "Tìm roommate gần HCMUS, chuyển vào đầu tháng",
    content: "Phòng thoáng, có ban công và máy giặt. Ưu tiên bạn gọn gàng, sinh hoạt điều độ.",
    address: "Khu phố 6, Linh Trung",
    rent: 2_400_000,
    peopleNeeded: 1,
    genderPreference: "any" as const,
    areaM2: 22,
    roommateRequirements: "Không hút thuốc, chia sẻ việc dọn dẹp.",
    roomType: "shared" as const,
    district: "Thủ Đức",
    amenities: ["Wifi", "Máy giặt", "Ban công"],
    contactInfo: "Liên hệ qua SiVi",
  },
  {
    title: "Phòng riêng gần bến xe buýt ĐHQG",
    content: "Phòng riêng có cửa sổ, đi bộ đến trạm xe buýt và khu ăn uống.",
    address: "Đường Tô Vĩnh Diện",
    rent: 3_600_000,
    peopleNeeded: 1,
    genderPreference: "female" as const,
    areaM2: 18,
    roommateRequirements: "Ưu tiên sinh viên nữ.",
    roomType: "private" as const,
    district: "Thủ Đức",
    amenities: ["Wifi", "Chỗ để xe"],
    contactInfo: "Liên hệ qua SiVi",
  },
  {
    title: "Tìm 2 bạn ở ghép căn hộ mini",
    content: "Căn hộ sạch sẽ, có bếp riêng và khu vực để xe an toàn.",
    address: "Làng Đại học",
    rent: 1_800_000,
    peopleNeeded: 2,
    genderPreference: "any" as const,
    areaM2: 30,
    roommateRequirements: "Tôn trọng không gian chung.",
    roomType: "shared" as const,
    district: "Dĩ An",
    amenities: ["Bếp", "Máy lạnh", "Chỗ để xe"],
    contactInfo: "Liên hệ qua SiVi",
  },
];

const reviews = [
  {
    title: "Cafe yên tĩnh để học bài ở khu ĐHQG",
    content: "Quán có nhiều ổ cắm, nhạc nhẹ và chỗ ngồi rộng. Đi buổi sáng khá thoải mái.",
    address: "Đường Tô Vĩnh Diện, Thủ Đức",
    placeName: "Nắng Study Cafe",
    placeType: "cafe" as const,
    referencePrice: 45_000,
    rating: 5,
    experience: "Wifi ổn định, nhân viên thân thiện.",
    priceRange: "medium" as const,
    wifiRating: 5,
    atmosphereRating: 5,
    serviceRating: 4,
  },
  {
    title: "Bữa trưa nhanh gần cổng trường",
    content: "Phần ăn đầy đặn, phục vụ nhanh và giá vừa túi tiền sinh viên.",
    address: "Khu vực cổng ĐHQG",
    placeName: "Cơm Nhà Mình",
    placeType: "restaurant" as const,
    referencePrice: 35_000,
    rating: 4,
    experience: "Nên đi trước giờ cao điểm để không phải chờ.",
    priceRange: "low" as const,
    wifiRating: null,
    atmosphereRating: 4,
    serviceRating: 4,
  },
  {
    title: "Góc ăn vặt buổi tối đáng thử",
    content: "Có nhiều món ăn vặt, chỗ ngồi thoáng và mở khá muộn.",
    address: "Khu phố 6, Linh Trung",
    placeName: "Góc Ăn Vặt 6",
    placeType: "street_food" as const,
    referencePrice: 50_000,
    rating: 4,
    experience: "Hợp đi cùng nhóm bạn sau giờ học.",
    priceRange: "low" as const,
    wifiRating: null,
    atmosphereRating: 4,
    serviceRating: 5,
  },
];

type RoommateSeed = (typeof roommates)[number];
type ReviewSeed = (typeof reviews)[number];

async function seedPost(authorId: number, type: "roommate", data: RoommateSeed): Promise<number>;
async function seedPost(authorId: number, type: "review", data: ReviewSeed): Promise<number>;
async function seedPost(
  authorId: number,
  type: "roommate" | "review",
  data: RoommateSeed | ReviewSeed,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: posts.id }).from(posts)
      .where(and(eq(posts.authorId, authorId), eq(posts.title, data.title))).limit(1);
    if (existing) return existing.id;

    const [post] = await tx.insert(posts).values({
      authorId,
      postType: type,
      title: data.title,
      content: data.content,
      address: data.address,
    }).returning({ id: posts.id });

    if ("rent" in data) {
      await tx.insert(roommatePosts).values({
        postId: post.id,
        rent: String(data.rent),
        peopleNeeded: data.peopleNeeded,
        genderPreference: data.genderPreference,
        areaM2: String(data.areaM2),
        roommateRequirements: data.roommateRequirements,
        roomType: data.roomType,
        district: data.district,
        amenities: data.amenities,
        contactInfo: data.contactInfo,
      });
    } else {
      await tx.insert(reviewPosts).values({
        postId: post.id,
        placeName: data.placeName,
        placeType: data.placeType,
        referencePrice: data.referencePrice === null ? null : String(data.referencePrice),
        rating: data.rating,
        experience: data.experience,
        priceRange: data.priceRange,
        wifiRating: data.wifiRating,
        atmosphereRating: data.atmosphereRating,
        serviceRating: data.serviceRating,
      });
    }
    await tx.insert(moderationLogs).values({
      postId: post.id,
      contentType: "post",
      result: "approved",
      needsReview: false,
      labels: { simulated: 1, tags: ["demo"] },
      modelVersion: "sivi-demo-seed-v1",
      policyVersion: "sivi-demo-policy-v1",
    });
    return post.id;
  });
}

async function seedComment(authorId: number, postId: number, content: string) {
  await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: comments.id }).from(comments)
      .where(and(eq(comments.authorId, authorId), eq(comments.postId, postId), eq(comments.content, content)))
      .limit(1);
    if (existing) return;
    const [comment] = await tx.insert(comments).values({ authorId, postId, content }).returning({ id: comments.id });
    await tx.insert(moderationLogs).values({
      commentId: comment.id,
      contentType: "comment",
      result: "approved",
      needsReview: false,
      labels: { simulated: 1, tags: ["demo"] },
      modelVersion: "sivi-demo-seed-v1",
      policyVersion: "sivi-demo-policy-v1",
    });
  });
}

async function seed() {
  const usersByRole = await db.transaction(async (tx) => {
    for (const university of demoUniversities) await ensureDemoUniversity(tx, university);
    const guest = await ensureDemoUser(tx, "guest");
    const student = await ensureDemoUser(tx, "student");
    await ensureDemoUser(tx, "admin");
    return { guest, student };
  });

  const roommateIds = [];
  for (const item of roommates) roommateIds.push(await seedPost(usersByRole.student.id, "roommate", item));
  const reviewIds = [];
  for (const item of reviews) reviewIds.push(await seedPost(usersByRole.student.id, "review", item));

  const sampleComments = [
    [roommateIds[0], usersByRole.guest.id, "Khu này đi xe buýt đến trường tiện không bạn?"],
    [roommateIds[1], usersByRole.student.id, "Mình đã ở gần đó, buổi tối khá yên tĩnh."],
    [roommateIds[2], usersByRole.guest.id, "Cho mình xin thêm thông tin về thời gian chuyển vào nhé."],
    [reviewIds[0], usersByRole.guest.id, "Cảm ơn bạn, mình sẽ ghé thử cuối tuần!"],
    [reviewIds[1], usersByRole.student.id, "Mình cũng thích món cơm gà ở đây."],
    [reviewIds[2], usersByRole.guest.id, "Quán có chỗ gửi xe không ạ?"],
  ] as const;
  for (const [postId, authorId, content] of sampleComments) await seedComment(authorId, postId, content);

  console.info(`Seeded demo data: 3 universities, 3 accounts, ${roommateIds.length} roommate posts, ${reviewIds.length} reviews.`);
}

seed()
  .catch((error: unknown) => {
    console.error("Demo seed failed", error instanceof Error ? error.message : "UnknownError");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$client.end();
  });
