"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CommentFormUser } from "./CommentForm";
import { ReportButton } from "./ReportForm";

/** Data supplied by the page through server/comments/service.ts. */
export interface CommentListItem {
  id: number;
  authorName: string;
  authorId?: number;
  content: string;
  createdAt: Date | string;
  status: "active" | "hidden";
}

export interface CommentListProps {
  comments: readonly CommentListItem[];
  user?: (CommentFormUser & { id?: number }) | null;
  /** Place CommentForm here to keep the layout from branch an. */
  children?: ReactNode;
}

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export default function CommentList({ comments, user = null, children }: CommentListProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  async function removeComment(id: number) {
    if (saving || deleting !== null || !window.confirm("Xóa bình luận này?")) return;
    setDeleting(id);
    setError("");
    try {
      const response = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? "Không thể xóa bình luận. Vui lòng thử lại.");
        return;
      }
      setDeletedIds((ids) => [...ids, id]);
      router.refresh();
    } catch {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setDeleting(null);
    }
  }

  async function saveComment(id: number) {
    if (saving || deleting !== null || !draft.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? "Không thể sửa bình luận. Vui lòng thử lại.");
        return;
      }
      setEdited((items) => ({ ...items, [id]: draft.trim() }));
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Không thể kết nối. Nội dung sửa vẫn được giữ lại.");
    } finally {
      setSaving(false);
    }
  }

  const visibleComments = comments.filter((comment) => comment.status === "active" && !deletedIds.includes(comment.id));

  return (
    <section id="post-comments" className="post-comments mt-6 scroll-mt-24 rounded-3xl border border-[#dfdfd2] bg-[#fffefa] p-5 sm:p-8">
      <h2 className="text-xl font-bold">Bình luận ({visibleComments.length})</h2>
      {children}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 divide-y divide-[#edf0eb]">
        {visibleComments.map((comment) => {
          const createdAt = new Date(comment.createdAt);
          const hasValidDate = !Number.isNaN(createdAt.getTime());

          return (
            <article key={comment.id} className="comment-entry py-5 first:pt-0">
              <div className="comment-avatar" aria-hidden="true">{(comment.authorName.trim() || "S").charAt(0).toUpperCase()}</div>
              <div className="comment-content">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">
                  {comment.authorName.trim() || "Sinh viên"}{" "}
                  {hasValidDate && (
                    <time
                      dateTime={createdAt.toISOString()}
                      className="ml-2 text-xs font-normal text-[#819188]"
                    >
                      {dateFormatter.format(createdAt)}
                    </time>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  {user?.id !== undefined && user.id === comment.authorId && user.role === "student" && user.isVerified && (
                    <>
                    <button type="button" disabled={saving || deleting !== null}
                      onClick={() => { setEditingId(comment.id); setDraft(edited[comment.id] ?? comment.content); setError(""); }}
                      className="text-sm font-semibold text-[#187b5b]">Sửa</button>
                    <button type="button" disabled={saving || deleting !== null} onClick={() => removeComment(comment.id)}
                      className="text-sm font-semibold text-red-700 disabled:opacity-50">
                      {deleting === comment.id ? "Đang xóa…" : "Xóa"}
                    </button>
                    </>
                  )}
                  <ReportButton commentId={comment.id} user={user} />
                </div>
              </div>
              {editingId === comment.id ? (
                <form className="mt-3" onSubmit={(event) => { event.preventDefault(); void saveComment(comment.id); }}>
                  <label htmlFor={`edit-comment-${comment.id}`} className="sr-only">Sửa bình luận</label>
                  <textarea id={`edit-comment-${comment.id}`} autoFocus required maxLength={2000} rows={3}
                    disabled={saving} value={draft} onChange={(event) => setDraft(event.target.value)}
                    className="w-full rounded-xl border border-[#dce4dd] bg-white p-3 text-sm" />
                  <div className="mt-2 flex gap-3">
                    <button type="submit" disabled={saving || !draft.trim()} className="rounded-lg bg-[#187b5b] px-3 py-2 text-sm text-white disabled:opacity-50">
                      {saving ? "Đang kiểm duyệt…" : "Lưu"}
                    </button>
                    <button type="button" disabled={saving} onClick={() => setEditingId(null)} className="px-3 py-2 text-sm">Hủy</button>
                  </div>
                </form>
              ) : (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#53685f]">
                  {edited[comment.id] ?? comment.content}
                </p>
              )}
              </div>
            </article>
          );
        })}
        {visibleComments.length === 0 && (
          <p className="py-5 text-sm text-[#819188]">Chưa có bình luận nào.</p>
        )}
      </div>
    </section>
  );
}
