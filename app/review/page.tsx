import type { Metadata } from "next";
import PostList from "@/components/forum/PostList";
import { ErrorState } from "@/components/ui/Feedback";
import { getCurrentUser } from "@/server/auth/current-user";
import { listPosts } from "@/server/posts/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Review địa điểm | SiVi",
  description: "Khám phá và chia sẻ review quán ăn, cafe, photo quanh Làng Đại học.",
};

async function loadReviewFeed() {
  try {
    const user = await getCurrentUser();
    const { items } = await listPosts({ type: "review", viewerId: user?.id, limit: 50 });
    return { user, items, error: false as const };
  } catch (error) {
    console.error("Could not load review feed", error instanceof Error ? error.name : "UnknownError");
    return { error: true as const };
  }
}

export default async function ReviewPage() {
  const result = await loadReviewFeed();
  if (result.error) {
    return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><ErrorState title="Chưa thể tải review địa điểm">Dịch vụ đọc bài đang gặp sự cố. Vui lòng thử tải lại trang sau.</ErrorState></main>;
  }
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-3xl bg-[#eaf2eb] px-5 py-8 sm:px-10 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#187b5b]">Khám phá quanh Làng Đại học</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-[#18352d] sm:text-5xl">Review địa điểm thật từ sinh viên</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#53685f] sm:text-base">Tìm quán ăn, cafe và những địa điểm đáng thử qua trải nghiệm của cộng đồng SiVi.</p>
      </section>
      <section className="mt-8" aria-label="Danh sách review địa điểm">
        <PostList posts={result.items} type="review" user={result.user} />
      </section>
    </main>
  );
}
