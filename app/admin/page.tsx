import Link from "next/link";
import ReportQueue from "../../components/admin/ReportQueue";
import { AdminError, listFlaggedContent, listReportQueue, requireAdmin } from "../../server/admin/service";
import ModerationScores from "../../components/admin/ModerationScores";
import type { ReportQueueItem } from "../../server/admin/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản trị báo cáo | SiVi" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const params = await searchParams;
  const status = params.status === "processed" || params.status === "flagged" ? params.status : "pending";
  const href = status === "pending" ? "/admin" : `/admin?status=${status}`;
  let items: ReportQueueItem[] = [];
  let flagged: Awaited<ReturnType<typeof listFlaggedContent>> = [];
  let message: string | null = null;
  try {
    const admin = await requireAdmin();
    if (status === "flagged") flagged = await listFlaggedContent(admin.id);
    else items = await listReportQueue(admin.id, status);
  } catch (error) {
    message = error instanceof AdminError ? error.message : "Không tải được hàng chờ báo cáo. Vui lòng thử lại sau.";
  }
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#18352d]">
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <Link href="/" className="text-sm font-semibold text-[#187b5b]">← Về trang chủ</Link>
        <h1 className="mt-5 text-3xl font-bold">Quản trị báo cáo</h1>
        <nav aria-label="Trạng thái báo cáo" className="my-6 flex flex-wrap gap-3">
          {[{ value: "pending", label: "Chờ xử lý", href: "/admin" }, { value: "processed", label: "Đã xử lý", href: "/admin?status=processed" }, { value: "flagged", label: "AI gắn cờ", href: "/admin?status=flagged" }].map((tab) => (
            <Link key={tab.value} href={tab.href} aria-current={status === tab.value ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${status === tab.value ? "bg-[#187b5b] text-white" : "border border-[#dce4dd] bg-white text-[#64766e]"}`}>
              {tab.label}
            </Link>
          ))}
        </nav>
        {message ? (
          <div className="rounded-2xl border border-[#e5e9e2] bg-white p-6">
            <p role="alert" className="text-sm text-[#64766e]">{message}</p>
            <Link href={href} className="mt-4 inline-block font-semibold text-[#187b5b]">Thử lại</Link>
          </div>
        ) : status === "flagged" ? (
          <ul className="space-y-4">
            {flagged.length === 0 && <li className="rounded-2xl bg-white p-6">Chưa có nội dung hiển thị nào được AI gắn cờ.</li>}
            {flagged.map((item) => (
              <li key={item.logId} className="rounded-2xl border border-[#e5e9e2] bg-white p-6">
                <Link href={`/posts/${item.postId}`} className="font-bold text-[#187b5b] hover:underline">
                  {item.commentId && "Bình luận trong bài "}{item.title}
                </Link>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.content}</p>
                <ModerationScores labels={item.labels} />
                <p className="mt-3 text-xs text-[#64766e]">{item.modelVersion} · {item.scannedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
              </li>
            ))}
          </ul>
        ) : <ReportQueue items={items} status={status} />}
      </section>
    </main>
  );
}
