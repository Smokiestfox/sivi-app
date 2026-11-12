"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import StudentVerificationForm from "@/components/profile/StudentVerificationForm";
import type { CommentDto } from "@/server/comments/service";
import type { CurrentUser } from "@/server/auth/current-user";
import type { PostDto } from "@/server/posts/service";

type Props = {
  user: CurrentUser;
  posts: PostDto[];
  comments: CommentDto[];
};

type Editing =
  | { type: "post"; item: PostDto }
  | { type: "comment"; item: CommentDto }
  | null;

function messageFrom(body: unknown) {
  if (!body || typeof body !== "object" || !("error" in body)) return null;
  const error = body.error;
  if (typeof error === "string") return error;
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : null;
}

function postPayload(post: PostDto, title: string, content: string) {
  const common = {
    type: post.type,
    title,
    content,
    address: post.address,
    googleMapsUrl: post.googleMapsUrl,
  };
  if (post.type === "roommate") {
    return {
      ...common,
      type: "roommate" as const,
      rent: post.rent,
      peopleNeeded: post.peopleNeeded,
      genderPreference: post.genderPreference,
      areaM2: post.areaM2,
      roommateRequirements: post.roommateRequirements,
      roomType: post.roomType,
      district: post.district,
      amenities: post.amenities,
      contactInfo: post.contactInfo,
    };
  }
  return {
    ...common,
    type: "review" as const,
    placeName: post.placeName,
    placeType: post.placeType,
    referencePrice: post.referencePrice,
    rating: post.rating,
    experience: post.experience,
    priceRange: post.priceRange,
    wifiRating: post.wifiRating,
    atmosphereRating: post.atmosphereRating,
    serviceRating: post.serviceRating,
  };
}

export default function ProfileDashboard({ user, posts, comments }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function startEditing(item: PostDto | CommentDto) {
    if ("title" in item) {
      setEditing({ type: "post", item });
      setTitle(item.title);
    } else {
      setEditing({ type: "comment", item });
      setTitle("");
    }
    setContent(item.content);
    setError("");
  }

  function closeEditor() {
    if (busy) return;
    setEditing(null);
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setError("");
    try {
      let response: Response;
      if (editing.type === "post") {
        const form = new FormData();
        form.set("payload", JSON.stringify(postPayload(editing.item, title, content)));
        form.set("keepImageIds", JSON.stringify(editing.item.images.map((image) => image.id)));
        response = await fetch(`/api/posts/${editing.item.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          body: form,
        });
      } else {
        response = await fetch(`/api/comments/${editing.item.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      }

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        setError(messageFrom(body) ?? "Không thể lưu thay đổi. Nội dung bạn nhập vẫn được giữ lại.");
        return;
      }
      setEditing(null);
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Nội dung bạn nhập vẫn được giữ lại.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(type: "post" | "comment", id: number) {
    if (!window.confirm(type === "post" ? "Bạn có chắc muốn xóa bài đăng này?" : "Bạn có chắc muốn xóa bình luận này?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(type === "post" ? `/api/posts/${id}` : `/api/comments/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        setError(messageFrom(body) ?? "Không thể xóa nội dung. Vui lòng thử lại.");
        return;
      }
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#e5e9e2] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#187b5b]">Tài khoản SiVi</p>
        <h1 className="mt-2 text-3xl font-black text-[#18352d]">{user.name}</h1>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold text-[#819188]">Email tài khoản</dt><dd className="mt-1 break-all text-[#36564a]">{user.email}</dd></div>
          <div><dt className="font-semibold text-[#819188]">Email trường</dt><dd className="mt-1 break-all text-[#36564a]">{user.universityEmail ?? "Chưa xác thực"}</dd></div>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {user.role === "student" && user.isVerified ? (
            <span className="rounded-full bg-[#e7f3ed] px-3 py-1.5 text-xs font-bold text-[#187b5b]">Sinh viên đã xác thực</span>
          ) : user.role === "admin" ? (
            <span className="rounded-full bg-[#f7eddc] px-3 py-1.5 text-xs font-bold text-[#94651d]">Quản trị viên</span>
          ) : (
            <>
              <span className="rounded-full bg-[#f1f4f0] px-3 py-1.5 text-xs font-bold text-[#64766e]">Guest</span>
              <StudentVerificationForm triggerLabel="Xác thực sinh viên" />
            </>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-[#e5e9e2] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-[#18352d]">Bài đăng của tôi</h2>
          <span className="rounded-full bg-[#f1f4f0] px-3 py-1 text-sm font-bold text-[#64766e]">{posts.length}</span>
        </div>
        <div className="mt-5 divide-y divide-[#edf0eb]">
          {posts.map((post) => (
            <article key={post.id} className="flex flex-col gap-3 py-5 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-[#187b5b]">{post.type === "roommate" ? "Roommate" : "Review"}</p>
                <Link href={`/posts/${post.id}`} className="mt-1 block truncate text-lg font-bold text-[#18352d] hover:text-[#187b5b]">{post.title}</Link>
                <p className="mt-1 line-clamp-2 text-sm text-[#64766e]">{post.content}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={busy} onClick={() => startEditing(post)} className="rounded-full border border-[#dce4dd] px-4 py-2 text-sm font-bold text-[#187b5b] disabled:opacity-50">Sửa</button>
                <button type="button" disabled={busy} onClick={() => void remove("post", post.id)} className="rounded-full border border-[#ecd9d4] px-4 py-2 text-sm font-bold text-[#a44735] disabled:opacity-50">Xóa</button>
              </div>
            </article>
          ))}
          {posts.length === 0 && <p className="py-5 text-sm text-[#819188]">Bạn chưa có bài đăng nào.</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-[#e5e9e2] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-[#18352d]">Bình luận của tôi</h2>
          <span className="rounded-full bg-[#f1f4f0] px-3 py-1 text-sm font-bold text-[#64766e]">{comments.length}</span>
        </div>
        <div className="mt-5 divide-y divide-[#edf0eb]">
          {comments.map((comment) => (
            <article key={comment.id} className="flex flex-col gap-3 py-5 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Link href={`/posts/${comment.postId}`} className="text-xs font-bold text-[#187b5b] hover:underline">Mở bài viết</Link>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#36564a]">{comment.content}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={busy} onClick={() => startEditing(comment)} className="rounded-full border border-[#dce4dd] px-4 py-2 text-sm font-bold text-[#187b5b] disabled:opacity-50">Sửa</button>
                <button type="button" disabled={busy} onClick={() => void remove("comment", comment.id)} className="rounded-full border border-[#ecd9d4] px-4 py-2 text-sm font-bold text-[#a44735] disabled:opacity-50">Xóa</button>
              </div>
            </article>
          ))}
          {comments.length === 0 && <p className="py-5 text-sm text-[#819188]">Bạn chưa có bình luận nào.</p>}
        </div>
      </section>

      {error && !editing && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {editing && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[#10271f]/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (!busy && event.target === event.currentTarget) closeEditor();
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <h2 id="profile-edit-title" className="text-2xl font-bold text-[#18352d]">
              Sửa {editing.type === "post" ? "bài đăng" : "bình luận"}
            </h2>
            <form onSubmit={save} className="mt-5 space-y-4">
              {editing.type === "post" && (
                <label className="block text-sm font-semibold text-[#36564a]">
                  Tiêu đề
                  <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required disabled={busy} className="mt-1.5 w-full rounded-xl border border-[#dce4dd] px-3.5 py-3 outline-none focus:border-[#187b5b] disabled:opacity-60" />
                </label>
              )}
              <label className="block text-sm font-semibold text-[#36564a]">
                Nội dung
                <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={editing.type === "post" ? 5000 : 2000} required disabled={busy} rows={6} className="mt-1.5 w-full rounded-xl border border-[#dce4dd] px-3.5 py-3 outline-none focus:border-[#187b5b] disabled:opacity-60" />
              </label>
              {busy && <p role="status" className="rounded-xl bg-[#e7f3ed] p-3 text-sm text-[#187b5b]">AI đang kiểm duyệt nội dung...</p>}
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <div className="flex justify-end gap-3 border-t border-[#edf0eb] pt-4">
                <button type="button" disabled={busy} onClick={closeEditor} className="rounded-full border border-[#dce4dd] px-5 py-2.5 text-sm font-bold text-[#53685f] disabled:opacity-50">Hủy</button>
                <button type="submit" disabled={busy} className="rounded-full bg-[#187b5b] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang kiểm duyệt..." : "Lưu thay đổi"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
