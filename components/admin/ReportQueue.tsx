"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button, Card, Empty, Input, Tag } from "antd";
import type { AdminDecision, QueueStatus, ReportQueueItem } from "../../server/admin/service";

export interface ReportQueueProps {
  items: readonly ReportQueueItem[];
  status: QueueStatus;
}

const reasons = { spam: "Spam", abuse: "Xúc phạm hoặc quấy rối", misinformation: "Sai thông tin", other: "Lý do khác" };
const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
function formatDate(value: string) { return dateFormatter.format(new Date(value)); }

export default function ReportQueue({ items, status }: ReportQueueProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshing, startTransition] = useTransition();
  const submissionLock = useRef(false);
  const busy = busyKey !== null || refreshing;

  async function resolve(item: ReportQueueItem, decision: AdminDecision) {
    if (submissionLock.current || busy || status !== "pending") return;
    setError(""); setSuccess("");
    const note = notes[item.key] ?? "";
    if (note.length > 1000) {
      setError("Ghi chú không được vượt quá 1000 ký tự.");
      return;
    }
    if (decision === "remove" && !window.confirm(`Gỡ ${item.target.type === "comment" ? "bình luận" : "bài đăng"} và xử lý toàn bộ ${item.reports.length} báo cáo đang chờ của nội dung này?`)) return;

    submissionLock.current = true;
    setBusyKey(item.key);
    try {
      const response = await fetch(`/api/admin/reports/${item.reportId}`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: note.trim() }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result !== null && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error : "Không thể xử lý báo cáo. Vui lòng thử lại sau.");
        if (response.status === 404 || response.status === 409) startTransition(() => router.refresh());
        return;
      }
      setSuccess(result !== null && typeof result === "object" && "message" in result && typeof result.message === "string"
        ? result.message : "Đã xử lý cụm báo cáo.");
      setNotes((current) => {
        const next = { ...current };
        delete next[item.key];
        return next;
      });
      startTransition(() => router.refresh());
    } catch {
      setError("Không thể kết nối máy chủ. Ghi chú vẫn được giữ lại, vui lòng thử lại sau.");
    } finally {
      submissionLock.current = false;
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4" aria-busy={busy}>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-[#dce4dd] bg-white p-4 text-sm text-[#187b5b]">{success}</p>}
      {items.length === 0 ? (
        <Card><Empty description={status === "pending" ? "Không có báo cáo đang chờ xử lý" : "Chưa có báo cáo đã xử lý"} /></Card>
      ) : (
        <>
          <p className="text-sm text-[#64766e]">{items.length} cụm nội dung · {items.reduce((count, item) => count + item.reports.length, 0)} báo cáo {status === "pending" ? "đang chờ" : "đã xử lý"}</p>
          {items.map((item) => {
            const hidden = item.target.status !== "active" || item.target.parentStatus !== "active";
            const moderation = item.moderation;
            return (
              <Card key={item.key} className="!rounded-2xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Tag color="blue">{item.target.type === "comment" ? "Bình luận" : item.target.postType === "review" ? "Review" : "Roommate"}</Tag>
                    <Tag>{item.reports.length} báo cáo {status === "pending" ? "đang chờ" : "đã xử lý"}</Tag>
                    <Tag>{item.totalCount} báo cáo tổng cộng</Tag>
                    {hidden && <Tag color="red">Nội dung đã bị ẩn</Tag>}
                  </div>
                  <div>
                    <Tag color={!moderation ? "default" : moderation.result === "approved" ? "green" : "red"}>
                      AI: {!moderation ? "Chưa có kết quả" : moderation.result === "approved" ? "Đạt" : "Từ chối"}
                    </Tag>
                    {moderation?.needsReview && <Tag color="gold">Cần xem lại</Tag>}
                  </div>
                </div>
                {item.target.title && <h2 className="mt-4 break-words text-lg font-bold text-[#18352d]">{item.target.title}</h2>}
                <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-[#f7f8f5] p-4 text-sm leading-6 text-[#18352d]">{item.target.content}</p>
                <p className="mt-3 text-sm text-[#36564a]"><strong>Chủ nội dung:</strong> {item.target.authorName}</p>
                {moderation && <p className="mt-2 text-sm text-[#64766e]">Kiểm duyệt: {moderation.reason || "Không có ghi chú"} · Model {moderation.modelVersion} · {formatDate(moderation.scannedAt)}</p>}
                <ul className="mt-4 space-y-3 border-t border-[#edf0eb] pt-4">
                  {item.reports.map((report) => (
                    <li key={report.id} className="text-sm text-[#53685f]">
                      <p><strong>{report.reporterName}</strong> · {formatDate(report.createdAt)} · {reasons[report.reason]}</p>
                      {report.description && <p className="mt-1 whitespace-pre-wrap break-words">{report.description}</p>}
                      {report.status !== "pending" && (
                        <div className="mt-1">
                          <Tag color={report.status === "resolved_keep" ? "green" : "red"}>{report.status === "resolved_keep" ? "Đã giữ" : "Đã gỡ"}</Tag>
                          <span>{report.resolverName || "Quản trị viên"}{report.resolvedAt ? ` · ${formatDate(report.resolvedAt)}` : ""}</span>
                          {report.resolutionNote && <p className="mt-1 whitespace-pre-wrap break-words">Ghi chú xử lý: {report.resolutionNote}</p>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {status === "pending" && (
                  <div className="mt-4">
                    <label htmlFor={`note-${item.key}`} className="text-sm font-semibold text-[#36564a]">Ghi chú xử lý (không bắt buộc)</label>
                    <Input.TextArea
                      id={`note-${item.key}`} className="!mt-2" rows={2} maxLength={1000}
                      disabled={busy} value={notes[item.key] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [item.key]: event.target.value }))}
                    />
                    {hidden && <p className="mt-2 text-sm text-[#64766e]">Nội dung đang bị ẩn. Chọn gỡ để đóng các báo cáo còn chờ.</p>}
                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                      <Button disabled={busy || hidden} onClick={() => void resolve(item, "keep")}>Giữ nội dung</Button>
                      <Button danger type="primary" disabled={busy} loading={busyKey === item.key} onClick={() => void resolve(item, "remove")}>Gỡ nội dung</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
