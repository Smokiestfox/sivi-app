import type { Metadata } from "next";
import PostList from "@/components/forum/PostList";
import { ErrorState } from "@/components/ui/Feedback";
import { getCurrentUser } from "@/server/auth/current-user";
import { listPosts } from "@/server/posts/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Tìm chỗ ở | SiVi",
  description: "Tìm roommate và chỗ ở quanh Làng Đại học cùng cộng đồng sinh viên.",
};

async function loadRoommateFeed() {
  try {
    const user = await getCurrentUser();
    const { items } = await listPosts({ type: "roommate", viewerId: user?.id, limit: 50 });
    return { user, items, error: false as const };
  } catch (error) {
    console.error("Could not load roommate feed", error instanceof Error ? error.name : "UnknownError");
    return { error: true as const };
  }
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ authError?: string }> }) {
  const { authError } = await searchParams;
  const result = await loadRoommateFeed();
  if (result.error) {
    return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><ErrorState title="Chưa thể tải tin tìm chỗ ở">Dịch vụ đọc bài đang gặp sự cố. Vui lòng thử tải lại trang sau.</ErrorState></main>;
  }
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      {authError === "google_login_failed" && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          Không thể đăng nhập bằng Google. Vui lòng thử lại.
        </p>
      )}
      <section className="community-hero" aria-labelledby="home-title">
        <div className="community-hero-content">
          <p className="community-hero-eyebrow">Cộng đồng sinh viên Làng Đại học</p>
          <h1 id="home-title" className="community-hero-title">
            Tìm chỗ ở tốt,<br className="hidden sm:block" /> gặp bạn cùng nhà hợp gu.
          </h1>
          <p className="community-hero-description">
            Khám phá tin tìm roommate, phòng ở và chia sẻ thông tin với cộng đồng sinh viên.
          </p>
          <div className="community-hero-actions">
            <a href="#roommate-feed" className="community-hero-primary">Tìm phòng ngay <span aria-hidden="true">→</span></a>
            <a href="/review" className="community-hero-secondary">Khám phá địa điểm</a>
          </div>
        </div>
      </section>
      <section id="roommate-feed" className="mt-8 scroll-mt-24" aria-label="Danh sách bài tìm roommate">
        <PostList posts={result.items} type="roommate" user={result.user} />
      </section>
    </main>
  );
}
