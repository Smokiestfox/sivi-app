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
  const [optimisticState, setOptimisticState] = useState<{
    base: string;
    value: { upvotes: number; downvotes: number; currentUserVote: 1 | -1 | null };
  } | null>(null);
  const baseKey = `${upvotes}:${downvotes}:${currentUserVote ?? "none"}`;
  const voteState = optimisticState?.base === baseKey
    ? optimisticState.value
    : { upvotes, downvotes, currentUserVote };

  async function cast(value: 1 | -1) {
    if (!user || user.role !== "student" || !user.isVerified || busy) {
      setError("Bạn cần đăng nhập và xác thực sinh viên để bình chọn.");
      return;
    }
    setBusy(true);
    setError("");
    const previous = voteState;
    const nextVote = previous.currentUserVote === value ? null : value;
    setOptimisticState({ base: baseKey, value: {
      upvotes: previous.upvotes - (previous.currentUserVote === 1 ? 1 : 0) + (nextVote === 1 ? 1 : 0),
      downvotes: previous.downvotes - (previous.currentUserVote === -1 ? 1 : 0) + (nextVote === -1 ? 1 : 0),
      currentUserVote: nextVote,
    } });
    try {
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        setOptimisticState(null);
        setError(messageFrom(body) ?? "Không thể gửi bình chọn. Vui lòng thử lại.");
        return;
      }
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "counts" in body && "currentUserVote" in body) {
        const counts = body.counts;
        const currentVote = body.currentUserVote;
        if (
          counts && typeof counts === "object" &&
          "upvotes" in counts && typeof counts.upvotes === "number" &&
          "downvotes" in counts && typeof counts.downvotes === "number" &&
          (currentVote === 1 || currentVote === -1 || currentVote === null)
        ) {
          setOptimisticState({
            base: baseKey,
            value: { upvotes: counts.upvotes, downvotes: counts.downvotes, currentUserVote: currentVote },
          });
        }
      }
      router.refresh();
    } catch {
      setOptimisticState(null);
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
          aria-pressed={voteState.currentUserVote === 1}
          disabled={busy}
          onClick={() => void cast(1)}
          className={`rounded-full px-3 py-1.5 text-sm font-bold ${voteState.currentUserVote === 1 ? "bg-[#187b5b] text-white" : "text-[#36564a] hover:bg-[#eef4ef]"}`}
        >
          ↑ {voteState.upvotes}
        </button>
        <button
          type="button"
          aria-label="Downvote"
          aria-pressed={voteState.currentUserVote === -1}
          disabled={busy}
          onClick={() => void cast(-1)}
          className={`rounded-full px-3 py-1.5 text-sm font-bold ${voteState.currentUserVote === -1 ? "bg-[#a44735] text-white" : "text-[#36564a] hover:bg-[#f8eeeb]"}`}
        >
          ↓ {voteState.downvotes}
        </button>
      </div>
      {error && <Toast kind="error">{error}</Toast>}
    </div>
  );
}
