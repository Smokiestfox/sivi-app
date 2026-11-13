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

export default async function HomePage() {
  const result = await loadRoommateFeed();
  if (result.error) {
    return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><ErrorState title="Chưa thể tải tin tìm chỗ ở">Dịch vụ đọc bài đang gặp sự cố. Vui lòng thử tải lại trang sau.</ErrorState></main>;
  }
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-3xl bg-[#eaf2eb] px-5 py-8 sm:px-10 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#187b5b]">Cộng đồng sinh viên Làng Đại học</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-[#18352d] sm:text-5xl">Tìm chỗ ở tốt, gặp bạn cùng nhà hợp gu.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#53685f] sm:text-base">Khám phá tin tìm roommate, phòng ở và chia sẻ thông tin với cộng đồng sinh viên.</p>
      </section>
      <section className="mt-8" aria-label="Danh sách bài tìm roommate">
        <PostList posts={result.items} type="roommate" user={result.user} />
      </section>
    </main>
  );
}
