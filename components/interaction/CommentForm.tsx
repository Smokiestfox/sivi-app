"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import StudentVerificationForm from "@/components/profile/StudentVerificationForm";

export interface CommentFormUser {
  role: "guest" | "student" | "admin";
  isVerified: boolean;
}

export interface CommentFormProps {
  postId: number;
  /** Pass the current session user from the server; null means signed out. */
  user: CommentFormUser | null;
  postStatus?: "active" | "hidden";
}

const MAX_CONTENT_LENGTH = 2000;

function fallbackError(status: number): string {
  switch (status) {
    case 401:
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case 403:
      return "Bạn cần xác thực sinh viên để bình luận.";
    case 404:
    case 410:
      return "Bài đăng đã bị gỡ hoặc không còn tồn tại.";
    case 429:
      return "Bạn gửi quá nhiều bình luận. Vui lòng thử lại sau.";
    default:
      return status >= 500
        ? "Hệ thống đang bận, vui lòng thử lại sau. Nội dung của bạn vẫn được giữ lại."
        : "Không thể gửi bình luận. Vui lòng kiểm tra nội dung và thử lại.";
  }
}

export default function CommentForm({
  postId,
  user,
  postStatus = "active",
}: CommentFormProps) {
  const router = useRouter();
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const submissionLock = useRef(false);
  const canComment = user?.role === "student" && user.isVerified;
  const busy = submitting || refreshing;

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canComment || postStatus !== "active" || submissionLock.current || busy) return;

    setError("");
    setSuccess("");
    const submittedContent = content.trim();

    if (!submittedContent) {
      setError("Vui lòng nhập nội dung bình luận.");
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      setError(`Bình luận không được vượt quá ${MAX_CONTENT_LENGTH} ký tự.`);
      return;
    }

    submissionLock.current = true;
    setSubmitting(true);
    let saved = false;

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ content: submittedContent }),
      });

      if (!response.ok) {
        // Expected COM-01 contract: { error: string }; also handle non-JSON errors.
        const result: unknown = await response.json().catch(() => null);
        const message =
          result !== null &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string" &&
          result.error.trim()
            ? result.error
            : fallbackError(response.status);
        setError(message);
      } else {
        saved = true;
      }
    } catch {
      setError("Không thể kết nối máy chủ. Nội dung của bạn vẫn được giữ lại, vui lòng thử lại sau.");
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }

    if (saved) {
      setContent("");
      setSuccess("Đã đăng bình luận.");
      // The page reads comments on the server; COM-01 must invalidate any cached reads.
      startTransition(() => router.refresh());
    }
  }

  if (postStatus !== "active") {
    return <p className="mt-4 text-sm text-[#64766e]">Bài đăng đã bị gỡ, bạn không thể bình luận.</p>;
  }

  if (!canComment) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#64766e]">
        <p>
          {!user
            ? "Đăng nhập và xác thực sinh viên để bình luận."
            : user.role === "guest" || !user.isVerified
              ? "Xác thực email trường để bình luận."
              : "Chỉ sinh viên đã xác thực mới được bình luận."}
        </p>
        {user?.role === "guest" && <StudentVerificationForm triggerLabel="Xác thực để bình luận" />}
      </div>
    );
  }

  return (
    <form onSubmit={submitComment} noValidate aria-busy={busy} className="mt-5">
      <label htmlFor={inputId} className="sr-only">Nội dung bình luận</label>
      <textarea
        id={inputId}
        name="content"
        required
        maxLength={MAX_CONTENT_LENGTH}
        rows={3}
        value={content}
        disabled={busy}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          setContent(event.target.value);
          setError("");
          setSuccess("");
        }}
        placeholder="Chia sẻ ý kiến của bạn..."
        className="w-full rounded-xl border border-[#dce4dd] px-4 py-3 outline-none focus:border-[#187b5b] disabled:opacity-60"
      />
      {error && <p id={errorId} role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="mt-2 text-sm text-[#187b5b]">{success}</p>}
      {submitting && <p role="status" className="mt-2 text-sm text-[#187b5b]">AI đang kiểm duyệt nội dung...</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-3 rounded-full bg-[#187b5b] px-5 py-2.5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#187b5b] disabled:opacity-60"
      >
        {submitting ? "AI đang kiểm duyệt..." : refreshing ? "Đang cập nhật..." : "Gửi bình luận"}
      </button>
    </form>
  );
}
