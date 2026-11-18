import Link from "next/link";
import type { CurrentUser } from "@/server/auth/current-user";
import type { PostDto } from "@/server/posts/service";
import type { CommentDto } from "@/server/comments/service";
import PostOwnerActions from "@/components/forum/PostOwnerActions";
import CommentList from "@/components/interaction/CommentList";
import StudentVerificationForm from "./StudentVerificationForm";

type Props = {
  user: CurrentUser; tab: "posts" | "comments"; posts: PostDto[]; comments: CommentDto[];
  nextCursor: number | null; error?: boolean; paged?: boolean;
};
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });

export default function ProfileView({ user, tab, posts, comments, nextCursor, error, paged }: Props) {
  const verified = user.role === "student" && user.isVerified;
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <section className="overflow-hidden rounded-3xl border border-[#d9dfd2] bg-[#fffefa]">
      <div className="h-24 bg-gradient-to-r from-[#174d3c] via-[#438269] to-[#c3d8b9] sm:h-32" />
      <div className="relative px-6 pb-7 sm:px-8">
        <div aria-hidden="true" className="-mt-10 mb-4 grid h-20 w-20 place-items-center rounded-3xl border-4 border-[#fffefa] bg-[#e6eee1] text-3xl font-bold text-[#187b5b]">
          {user.name.trim().charAt(0).toUpperCase() || "S"}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64766e]">Trang cá nhân</p>
            <h1 className="mt-2 break-words text-2xl font-bold text-[#18352d] sm:text-3xl">{user.name}</h1>
            <p className="mt-2 break-all text-sm text-[#64766e]">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#e7f3ed] px-4 py-2 text-sm font-semibold text-[#187b5b]">
              {user.role === "admin" ? "Quản trị viên" : verified ? "Sinh viên đã xác thực" : "Chưa xác thực sinh viên"}
            </span>
            {user.role === "guest" && <StudentVerificationForm />}
          </div>
        </div>
      </div>
    </section>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
      <nav aria-label="Nội dung của tôi" className="flex gap-2 rounded-2xl bg-[#e8efe7] p-1.5">
        {[["posts", "Bài viết của tôi"], ["comments", "Bình luận của tôi"]].map(([value, label]) =>
          <Link key={value} href={`/profile?tab=${value}`} aria-current={tab === value ? "page" : undefined}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === value ? "bg-[#fffefa] text-[#187b5b] shadow-sm" : "text-[#64766e]"}`}>{label}</Link>)}
      </nav>
      <Link href="/" className="text-sm font-semibold text-[#187b5b]">Khám phá cộng đồng →</Link>
    </div>
    {error ? <div role="alert" className="mt-5 rounded-2xl border border-red-100 bg-[#fffefa] p-6">
      Không tải được nội dung. <Link className="font-semibold text-[#187b5b]" href={`/profile?tab=${tab}`}>Thử lại</Link>
    </div> : <>
      {tab === "posts" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {posts.map((post) => <article key={post.id} className="rounded-2xl border border-[#dfdfd2] bg-[#fffefa] p-6">
            <div className="flex items-center justify-between gap-3 text-xs text-[#64766e]">
              <span className="rounded-full bg-[#e8efe7] px-3 py-1 font-semibold text-[#187b5b]">{post.type === "roommate" ? "Tìm chỗ ở" : "Review địa điểm"}</span>
              <time dateTime={post.createdAt}>{date.format(new Date(post.createdAt))}</time>
            </div>
            <Link href={`/posts/${post.id}`} className="mt-4 block text-lg font-bold leading-7 text-[#18352d] hover:text-[#187b5b]">{post.title}</Link>
            <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-[#64766e]">{post.content}</p>
            {verified && <PostOwnerActions post={post} />}
          </article>)}
        </div>
      ) : <div className="profile-comments mt-5 space-y-4">
        {comments.map((comment) => <div key={comment.id}>
          <Link href={`/posts/${comment.postId}#post-comments`} className="text-sm font-semibold text-[#187b5b]">Mở bài viết #{comment.postId} →</Link>
          <CommentList comments={[{ id: comment.id, authorId: comment.author.id, authorName: comment.author.name,
            content: comment.content, createdAt: comment.createdAt, status: "active" }]} user={user} />
        </div>)}
      </div>}
      {(tab === "posts" ? posts.length : comments.length) === 0 && <div className="mt-5 rounded-3xl border border-dashed border-[#cbd5c5] bg-[#fffefa] px-6 py-14 text-center">
        <h2 className="text-lg font-bold text-[#36564a]">{tab === "posts" ? "Chưa có bài viết" : "Chưa có bình luận"}</h2>
        <p className="mt-2 text-sm text-[#64766e]">Những nội dung bạn chia sẻ sẽ xuất hiện tại đây.</p>
        <Link href="/" className="mt-5 inline-block rounded-xl bg-[#187b5b] px-5 py-3 text-sm font-semibold text-white">Tìm chỗ ở</Link>
      </div>}
      <nav aria-label="Phân trang" className="mt-6 flex justify-center gap-4 text-sm font-semibold text-[#187b5b]">
        {paged && <Link href={`/profile?tab=${tab}`}>Về đầu danh sách</Link>}
        {nextCursor !== null && <Link href={`/profile?tab=${tab}&cursor=${nextCursor}`}>Xem tiếp →</Link>}
      </nav>
    </>}
  </main>;
}
