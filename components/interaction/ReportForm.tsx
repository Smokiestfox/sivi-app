"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { CommentFormUser } from "./CommentForm";
import StudentVerificationForm from "@/components/profile/StudentVerificationForm";

type ReportTarget =
  | { postId: number; commentId?: never }
  | { commentId: number; postId?: never };

type ReportButtonProps = ReportTarget & { user: CommentFormUser | null };

export type ReportFormProps = ReportButtonProps & {
  open: boolean;
  onClose: () => void;
};

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "abuse", label: "Xúc phạm hoặc quấy rối" },
  { value: "misinformation", label: "Sai thông tin" },
  { value: "other", label: "Lý do khác" },
] as const;

function fallbackError(status: number) {
  switch (status) {
    case 401: return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case 403: return "Bạn không có quyền báo cáo. Vui lòng kiểm tra xác thực sinh viên hoặc tải lại trang.";
    case 404: return "Nội dung đã bị gỡ hoặc không còn tồn tại.";
    case 409: return "Bạn đã báo cáo nội dung này rồi.";
    case 429: return "Bạn gửi quá nhiều báo cáo. Vui lòng thử lại sau.";
    default: return "Không gửi được báo cáo. Vui lòng thử lại sau.";
  }
}

/** Can be placed directly in a Server Component; the open/close state stays here. */
export function ReportButton(props: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  if (props.user?.role === "guest" || (props.user?.role === "student" && !props.user.isVerified)) {
    return <StudentVerificationForm triggerLabel="Xác thực để báo cáo" />;
  }
  if (props.user?.role !== "student" || !props.user.isVerified) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-[#64766e] hover:text-[#187b5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#187b5b]"
      >
        Báo cáo
      </button>
      <ReportForm {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default function ReportForm(props: ReportFormProps) {
  if (!props.open) return null;
  // Reopening or changing the target starts a new draft, without leaking the old one.
  const targetKey = props.postId !== undefined ? `post-${props.postId}` : `comment-${props.commentId}`;
  return <ReportDialog key={targetKey} {...props} />;
}

function ReportDialog({ user, postId, commentId, onClose }: ReportFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submissionLock = useRef(false);
  const titleId = useId();
  const reasonId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const canReport = user?.role === "student" && user.isVerified;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReport || submissionLock.current || success) return;
    setError("");

    if (!REASONS.some((option) => option.value === reason)) {
      setError("Vui lòng chọn lý do báo cáo.");
      return;
    }
    if (description.length > 1000) {
      setError("Ghi chú không được vượt quá 1000 ký tự.");
      return;
    }

    submissionLock.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(postId !== undefined ? { postId } : { commentId }),
          reason,
          description: description.trim(),
        }),
      });
      if (!response.ok) {
        const result: unknown = await response.json().catch(() => null);
        setError(
          result !== null && typeof result === "object" && "error" in result &&
          typeof result.error === "string" && result.error.trim()
            ? result.error
            : fallbackError(response.status),
        );
        return;
      }
      setSuccess("Đã gửi báo cáo. Cảm ơn bạn đã hỗ trợ cộng đồng.");
    } catch {
      setError("Không thể kết nối máy chủ. Lý do và ghi chú vẫn được giữ lại, vui lòng thử lại sau.");
    } finally {
      submissionLock.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        if (!submissionLock.current) onClose();
      }}
      onClick={(event) => {
        if (submissionLock.current || event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
          onClose();
        }
      }}
      className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-3xl border-0 bg-white p-6 text-[#18352d] shadow-2xl backdrop:bg-[#10271f]/55 sm:p-8"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-2xl font-bold">Báo cáo nội dung</h2>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Đóng"
          className="rounded-full px-3 py-1 text-xl text-[#64766e] hover:bg-[#f1f4f0] disabled:opacity-60"
        >
          ×
        </button>
      </div>
      {!canReport ? (
        <p className="text-sm text-[#64766e]">
          {!user ? "Đăng nhập và xác thực sinh viên để báo cáo nội dung." : "Bạn cần có quyền sinh viên đã xác thực để báo cáo nội dung."}
        </p>
      ) : success ? (
        <div className="space-y-4">
          <p role="status" className="text-sm text-[#187b5b]">{success}</p>
          <button type="button" onClick={onClose} className="w-full rounded-xl bg-[#187b5b] px-4 py-3 font-bold text-white">
            Đóng
          </button>
        </div>
      ) : (
        <form onSubmit={submitReport} noValidate aria-busy={busy} className="space-y-4">
          <div className="text-sm text-[#36564a]">
            <label htmlFor={reasonId} className="block font-semibold">Lý do</label>
            <select
              id={reasonId}
              name="reason"
              required
              disabled={busy}
              value={reason}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => { setReason(event.target.value); setError(""); }}
              className="mt-2 w-full rounded-xl border border-[#dce4dd] px-4 py-3 font-normal outline-none focus:border-[#187b5b] disabled:opacity-60"
            >
              <option value="" disabled>Chọn lý do báo cáo</option>
              {REASONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="text-sm text-[#36564a]">
            <label htmlFor={descriptionId} className="block font-semibold">Ghi chú (không bắt buộc)</label>
            <textarea
              id={descriptionId}
              name="description"
              maxLength={1000}
              rows={3}
              disabled={busy}
              value={description}
              onChange={(event) => { setDescription(event.target.value); setError(""); }}
              className="mt-2 w-full rounded-xl border border-[#dce4dd] px-4 py-3 font-normal outline-none focus:border-[#187b5b] disabled:opacity-60"
            />
          </div>
          {error && <p id={errorId} role="alert" className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#187b5b] px-4 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#187b5b] disabled:opacity-60"
          >
            {busy ? "Đang gửi..." : "Gửi báo cáo"}
          </button>
        </form>
      )}
    </dialog>
  );
}
