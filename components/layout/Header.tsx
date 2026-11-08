import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-emerald-700">SiVi</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-slate-700 hover:text-emerald-700">
              Trang chủ
            </Link>
            <Link href="/forum/roommate" className="text-sm font-medium text-slate-700 hover:text-emerald-700">
              Tìm roommate
            </Link>
            <Link href="/forum/review" className="text-sm font-medium text-slate-700 hover:text-emerald-700">
              Review địa điểm
            </Link>
            <Link href="/profile" className="text-sm font-medium text-slate-700 hover:text-emerald-700">
              Cá nhân
            </Link>
            <Link href="/login" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">
              Đăng nhập
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}