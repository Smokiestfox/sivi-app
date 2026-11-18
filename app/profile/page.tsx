import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { listOwnComments } from "@/server/comments/service";
import ProfileDashboard from "@/components/profile/ProfileDashboard";
import { listOwnPosts } from "@/server/posts/service";
import { ErrorState } from "@/components/ui/Feedback";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cá nhân | SiVi" };

function cursor(value?: string) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ posts?: string; comments?: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-[#e5e9e2] bg-white p-8">
          <h1 className="text-3xl font-black text-[#18352d]">Trang cá nhân</h1>
          <p className="mt-3 text-sm leading-6 text-[#64766e]">Đăng nhập để xem tài khoản, bài đăng và bình luận của bạn.</p>
        </section>
      </main>
    );
  }

  const params = await searchParams;
  const postCursor = cursor(params.posts);
  const commentCursor = cursor(params.comments);
  let postPage;
  let commentPage;
  try {
    [postPage, commentPage] = await Promise.all([
      listOwnPosts(user.id, { cursor: postCursor }),
      listOwnComments(user.id, { cursor: commentCursor }),
    ]);
  } catch (error) {
    console.error("Could not load profile", error instanceof Error ? error.name : "UnknownError");
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <ErrorState title="Chưa thể tải trang cá nhân">Dịch vụ đọc nội dung đang gặp sự cố. Vui lòng tải lại trang sau.</ErrorState>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <ProfileDashboard user={user} posts={postPage.items} comments={commentPage.items} />
      <nav aria-label="Phân trang nội dung cá nhân" className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-[#187b5b]">
        {(postCursor || commentCursor) && <Link href="/profile">Về trang đầu</Link>}
        {postPage.nextCursor && <Link href={{ pathname: "/profile", query: { posts: postPage.nextCursor, comments: commentCursor } }}>Xem thêm bài đăng</Link>}
        {commentPage.nextCursor && <Link href={{ pathname: "/profile", query: { posts: postCursor, comments: commentPage.nextCursor } }}>Xem thêm bình luận</Link>}
      </nav>
    </main>
  );
}
