import { describe, expect, it } from "vitest";
import { moderate } from "../server/moderation/service";

const cases = [
  ["roommate", "Tìm bạn ở ghép gần UIT", "Phòng 24m², có máy lạnh. Mình tìm thêm một bạn nữ, chia tiền thuê 1,8 triệu mỗi tháng.", "approved"],
  ["review", "Cà phê cạnh ký túc xá", "Mình ghé quán hôm qua. Cà phê đậm, wifi ổn, nhưng buổi trưa hơi ồn. Mình chấm 4/5.", "approved"],
  ["ask", "Tìm quán in luận văn", "Mọi người giới thiệu giúp mình chỗ in màu và đóng bìa mở sau 20 giờ được không?", "approved"],
  ["review + ask", "Thư viện khu A", "Mình học ở đây cả chiều, phòng mát và ổ cắm đủ. Có bạn nào biết chủ nhật thư viện đóng lúc mấy giờ không?", "approved"],
  ["negative review", "Trải nghiệm ăn trưa không tốt", "Mình gọi cơm lúc 12 giờ và đợi 45 phút. Món nguội khi dọn ra. Mình góp ý quán báo trước thời gian chờ.", "approved"],
  ["violence report", "Cảnh báo gần cổng ký túc xá", "Tối qua mình chứng kiến một vụ đánh nhau gần cổng. Mọi người tránh khu đó nếu có xô xát và báo bảo vệ.", "approved"],
  ["health education", "Buổi tư vấn sức khỏe sinh sản", "Phòng y tế tổ chức buổi tư vấn về bao cao su và phòng bệnh lây truyền qua đường tình dục cho sinh viên.", "approved"],
  ["threat", "Tối nay tao sẽ đánh mày", "Tao sẽ đợi mày trước cổng ký túc xá tối nay và dùng dao đâm mày. Tao nói thật, cứ thử ra đây.", "rejected"],
  ["sexual solicitation", "Tìm bạn quan hệ tình dục tối nay", "Mình đăng để tìm người quan hệ tình dục với mình tối nay. Nhắn mình để hẹn vào phòng riêng và làm tình.", "rejected"],
  ["ragebait", "Ai ăn ở quán đó cũng ngu", "Cả đám fan của quán đó toàn lũ ngu. Vào đây cãi đi, tao muốn xem đứa nào cay nhất.", "approved"],
] as const;

describe.skipIf(process.env.SIVI_TEST_LAYA !== "1")("Laya live moderation", () => {
  it.each(cases)("%s", async (label, title, body, expected) => {
    const decision = await moderate({ contentType: "post", title, body });
    console.info(label, decision);
    expect(decision.result).toBe(expected);
    if (label === "threat") expect(decision).toMatchObject({ reason: expect.stringContaining("bạo lực") });
    if (label === "sexual solicitation") expect(decision).toMatchObject({ reason: expect.stringContaining("tình dục") });
    if (label === "ragebait") {
      expect(decision).toMatchObject({ needsReview: true, tags: expect.arrayContaining(["ragebait"]) });
    }
    if (label === "review" || label === "review + ask") {
      const tags = label === "review" ? ["review"] : ["review", "ask"];
      expect(decision).toMatchObject({ tags: expect.arrayContaining(tags) });
    }
    if (label === "ask") expect(decision).toMatchObject({ tags: expect.arrayContaining(["ask"]) });
  }, 15_000);
});
