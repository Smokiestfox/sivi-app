import type { ReactNode } from "react";

type FeedbackKind = "success" | "error" | "moderating";

const feedbackStyles: Record<FeedbackKind, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  moderating: "border-amber-200 bg-amber-50 text-amber-950",
};

export function Toast({
  kind,
  children,
}: {
  kind: FeedbackKind;
  children: ReactNode;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={`rounded-xl border px-4 py-3 text-sm ${feedbackStyles[kind]}`}
    >
      {children}
    </div>
  );
}

export function Loading({ label = "Đang tải..." }: { label?: string }) {
  return (
    <div role="status" className="rounded-2xl border border-[#e5e9e2] bg-white p-8 text-center text-[#64766e]">
      {label}
    </div>
  );
}

export function Empty({
  title = "Chưa có bài viết phù hợp",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cbd7ce] bg-white p-8 text-center">
      <h2 className="font-bold text-[#18352d]">{title}</h2>
      {children && <div className="mt-2 text-sm text-[#64766e]">{children}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Không tải được dữ liệu",
  children = "Dịch vụ đang gặp sự cố. Vui lòng thử tải lại trang.",
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 text-red-900">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}

export function NotFound({
  title = "Không tìm thấy nội dung",
  children = "Nội dung có thể đã bị gỡ hoặc không còn tồn tại.",
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#e5e9e2] bg-white p-8 text-center">
      <h1 className="text-xl font-bold text-[#18352d]">{title}</h1>
      <div className="mt-2 text-sm text-[#64766e]">{children}</div>
    </div>
  );
}
