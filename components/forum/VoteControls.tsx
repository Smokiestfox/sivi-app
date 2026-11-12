"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/Feedback";

type VoteControlsProps = {
  postId: number;
  user: { role: "guest" | "student" | "admin"; isVerified: boolean } | null;
  upvotes: number;
  downvotes: number;
  currentUserVote: 1 | -1 | null;
};

function messageFrom(value: unknown): string | null {
  if (value === null || typeof value !== "object" || !("error" in value)) return null;
  const error = value.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return null;
}

export default function VoteControls({ postId, user, upvotes, downvotes, currentUserVote }: VoteControlsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cast(value: 1 | -1) {
    if (!user || user.role !== "student" || !user.isVerified || busy) {
      setError("Bạn cần đăng nhập và xác thực sinh viên để bình chọn.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        setError(messageFrom(body) ?? "Không thể gửi bình chọn. Vui lòng thử lại.");
        return;
      }
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Bình chọn chưa được cập nhật.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-full border border-[#dce4dd] bg-white p-1">
        <button
          type="button"
          aria-label="Upvote"
          aria-pressed={currentUserVote === 1}
          disabled={busy}
          onClick={() => void cast(1)}
          className={`rounded-full px-3 py-1.5 text-sm font-bold ${currentUserVote === 1 ? "bg-[#187b5b] text-white" : "text-[#36564a] hover:bg-[#eef4ef]"}`}
        >
          ↑ {upvotes}
        </button>
        <button
          type="button"
          aria-label="Downvote"
          aria-pressed={currentUserVote === -1}
          disabled={busy}
          onClick={() => void cast(-1)}
          className={`rounded-full px-3 py-1.5 text-sm font-bold ${currentUserVote === -1 ? "bg-[#a44735] text-white" : "text-[#36564a] hover:bg-[#f8eeeb]"}`}
        >
          ↓ {downvotes}
        </button>
      </div>
      {error && <Toast kind="error">{error}</Toast>}
    </div>
  );
}
