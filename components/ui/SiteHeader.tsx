import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import StudentVerificationForm from "@/components/profile/StudentVerificationForm";

export default async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5e9e2] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="SiVi - Tìm chỗ ở" className="text-2xl font-black tracking-tight text-[#187b5b]">
          sivi<span className="text-[#e7a65a]">.</span>
        </Link>
        <nav aria-label="Điều hướng chính" className="order-3 flex w-full items-center gap-5 overflow-x-auto text-sm font-semibold text-[#36564a] sm:order-none sm:w-auto">
          <Link href="/" className="whitespace-nowrap hover:text-[#187b5b]">Tìm chỗ ở</Link>
          <Link href="/review" className="whitespace-nowrap hover:text-[#187b5b]">Review địa điểm</Link>
          {user?.role === "admin" && <Link href="/admin" className="whitespace-nowrap hover:text-[#187b5b]">Quản trị</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {user ? (
            <>
              <span className="max-w-32 truncate text-sm font-semibold text-[#36564a] sm:max-w-48">{user.name}</span>
              {user.role === "student" && user.isVerified ? (
                <span className="rounded-full bg-[#e7f3ed] px-3 py-1 text-xs font-bold text-[#187b5b]">Sinh viên</span>
              ) : user.role === "guest" ? (
                <StudentVerificationForm />
              ) : null}
              <button
                type="button"
                disabled
                title="Đăng xuất sẽ khả dụng sau khi tích hợp auth backend."
                className="rounded-full border border-[#dce4dd] px-4 py-2 text-sm font-bold text-[#64766e] opacity-60"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled
              title="Google OAuth chưa có route đăng nhập trên nhánh hiện tại."
              className="rounded-full bg-[#187b5b] px-4 py-2 text-sm font-bold text-white opacity-70"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
