import Link from "next/link";
import ReportQueue from "../../components/admin/ReportQueue";
import { AdminError, listReportQueue, requireAdmin } from "../../server/admin/service";
import type { ReportQueueItem } from "../../server/admin/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản trị báo cáo | SiVi" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const params = await searchParams;
  const status = params.status === "processed" ? "processed" : "pending";
  let items: ReportQueueItem[] = [];
  let message: string | null = null;
  try {
    const admin = await requireAdmin();
    items = await listReportQueue(admin.id, status);
  } catch (error) {
    message = error instanceof AdminError ? error.message : "Không tải được hàng chờ báo cáo. Vui lòng thử lại sau.";
  }
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#18352d]">
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <Link href="/" className="text-sm font-semibold text-[#187b5b]">← Về trang chủ</Link>
        <h1 className="mt-5 text-3xl font-bold">Quản trị báo cáo</h1>
        <nav aria-label="Trạng thái báo cáo" className="my-6 flex flex-wrap gap-3">
          {[{ value: "pending", label: "Chờ xử lý", href: "/admin" }, { value: "processed", label: "Đã xử lý", href: "/admin?status=processed" }].map((tab) => (
            <Link key={tab.value} href={tab.href} aria-current={status === tab.value ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${status === tab.value ? "bg-[#187b5b] text-white" : "border border-[#dce4dd] bg-white text-[#64766e]"}`}>
              {tab.label}
            </Link>
          ))}
        </nav>
        {message ? (
          <div className="rounded-2xl border border-[#e5e9e2] bg-white p-6">
            <p role="alert" className="text-sm text-[#64766e]">{message}</p>
            <Link href={status === "pending" ? "/admin" : "/admin?status=processed"} className="mt-4 inline-block font-semibold text-[#187b5b]">Thử lại</Link>
          </div>
        ) : <ReportQueue items={items} status={status} />}
      </section>
    </main>
  );
}
