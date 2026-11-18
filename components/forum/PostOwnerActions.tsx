"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PostDto } from "@/server/posts/service";
import PostForm from "./PostForm";

export default function PostOwnerActions({ post }: { post: PostDto }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (busy || !window.confirm("Xóa bài viết và các nội dung liên quan? Thao tác này không thể hoàn tác.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Không thể xóa bài. Vui lòng thử lại.");
        return;
      }
      router.push(post.type === "roommate" ? "/" : "/review");
      router.refresh();
    } catch {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mt-4">
    <div className="flex gap-3">
      <button type="button" disabled={busy} onClick={() => setEditing(true)}
        className="rounded-lg border border-[#dce4dd] px-3 py-2 text-sm font-semibold text-[#187b5b]">Sửa bài</button>
      <button type="button" disabled={busy} onClick={remove}
        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">{busy ? "Đang xóa…" : "Xóa bài"}</button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {editing && <PostForm type={post.type} existingPost={post} onClose={() => setEditing(false)} onCreated={() => router.refresh()} />}
  </div>;
}
