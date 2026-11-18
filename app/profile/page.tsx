import type { PostDto } from "@/server/posts/service";
import type { CommentDto } from "@/server/comments/service";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { listOwnPosts } from "@/server/posts/service";
import { listOwnComments } from "@/server/comments/service";
import ProfileView from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trang cá nhân | SiVi" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string; cursor?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return <main className="mx-auto max-w-xl px-6 py-20 text-center">
    <h1 className="text-2xl font-bold">Trang cá nhân của bạn</h1>
    <p className="mt-3 text-[#64766e]">Đăng nhập để quản lý bài viết và bình luận của mình.</p>
    <a href="/api/auth/google" className="mt-6 inline-block rounded-xl bg-[#187b5b] px-6 py-3 font-semibold text-white">Đăng nhập bằng Google</a>
    <Link href="/" className="mt-5 block text-sm text-[#187b5b]">← Về trang chủ</Link>
  </main>;
  const params = await searchParams;
  const tab = params.tab === "comments" ? "comments" : "posts";
  const cursor = params.cursor && /^[1-9]\d*$/.test(params.cursor) && Number.isSafeInteger(Number(params.cursor))
    ? Number(params.cursor) : undefined;
  let posts: PostDto[] = [];
  let comments: CommentDto[] = [];
  let nextCursor: number | null = null;
  let error = false;
  try {
    if (tab === "comments") {
      const page = await listOwnComments(user.id, { cursor, limit: 12 });
      comments = page.items;
      nextCursor = page.nextCursor;
    } else {
      const page = await listOwnPosts(user.id, { cursor, limit: 12 });
      posts = page.items;
      nextCursor = page.nextCursor;
    }
  } catch {
    error = true;
  }
  return <ProfileView user={user} tab={tab} posts={posts} comments={comments}
    nextCursor={nextCursor} paged={cursor !== undefined} error={error} />;
}
