import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostDetail from "@/components/forum/PostDetail";
import { ErrorState } from "@/components/ui/Feedback";
import { getCurrentUser } from "@/server/auth/current-user";
import { listComments } from "@/server/comments/service";
import { getPost } from "@/server/posts/service";

export const dynamic = "force-dynamic";

type PostPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return { title: "Không tìm thấy bài viết | SiVi" };
  }
  const post = await getPost(Number(id));
  return post
    ? { title: `${post.title} | SiVi`, description: post.content.slice(0, 160) }
    : { title: "Không tìm thấy bài viết | SiVi" };
}

async function loadPost(rawId: string) {
  try {
    const user = await getCurrentUser();
    const post = await getPost(Number(rawId), user?.id);
    if (!post) return { error: false as const, post: null };
    const { items } = await listComments(post.id);
    const comments = items.map((comment) => ({
      id: comment.id,
      authorName: comment.author.name,
      content: comment.content,
      createdAt: comment.createdAt,
      status: "active" as const,
    }));
    return { error: false as const, post, comments, user };
  } catch (error) {
    console.error("Could not load post detail", error instanceof Error ? error.name : "UnknownError");
    return { error: true as const };
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { id: rawId } = await params;
  if (!/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(Number(rawId))) notFound();

  const result = await loadPost(rawId);
  if (result.error) {
    return <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><ErrorState title="Chưa thể tải bài viết">Dịch vụ đọc bài đang gặp sự cố. Vui lòng thử tải lại trang sau.</ErrorState></main>;
  }
  if (!result.post) notFound();
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <PostDetail post={result.post} comments={result.comments} user={result.user} />
    </main>
  );
}
