import { Suspense } from 'react';
import SiteHeader from '@/components/SiteHeader';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#18352d]">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-6xl px-5 py-12 text-[#64766e]">Đang tải trang quản trị...</div>}>
        <AdminDashboard />
      </Suspense>
    </main>
  );
}
