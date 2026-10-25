'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { notify } from '@/components/feedback';
import StudentVerification from '@/components/StudentVerification';
import { useSession, type ClientUser } from '@/components/useSession';

export default function SiteHeader() {
  const { user, loaded, refresh } = useSession();
  const [verificationOpen, setVerificationOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('authError');
    if (authError) {
      notify(
        authError === 'not_configured'
          ? 'Đăng nhập Google chưa được cấu hình trên máy chủ.'
          : 'Đăng nhập Google không thành công. Vui lòng thử lại.',
        'error',
      );
      params.delete('authError');
      const queryString = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${queryString ? `?${queryString}` : ''}`);
    }
  }, []);

  async function logout() {
    try {
      const response = await fetch('/api/auth/session', { method: 'DELETE' });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || 'Không thể đăng xuất lúc này.');
      }
      await refresh();
      notify('Đã đăng xuất.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.', 'error');
    }
  }

  function onVerified(nextUser: ClientUser) {
    window.dispatchEvent(new CustomEvent('sivi:auth-changed', { detail: nextUser }));
    void refresh();
  }

  return (
    <>
      <header className="border-b border-[#e5e9e2] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="text-2xl font-black tracking-tight text-[#187b5b]">
            sivi<span className="text-[#f4a340]">.</span>
          </Link>
          <nav aria-label="Điều hướng chính" className="flex flex-wrap items-center gap-3 sm:gap-6">
            <Link href="/" className="text-sm font-semibold text-[#456057] hover:text-[#187b5b]">Tìm chỗ ở</Link>
            <Link href="/review" className="text-sm font-semibold text-[#456057] hover:text-[#187b5b]">Review địa điểm</Link>
            {user && <Link href="/profile" className="text-sm font-semibold text-[#456057] hover:text-[#187b5b]">Cá nhân</Link>}
            {user?.role === 'admin' && <Link href="/admin" className="text-sm font-semibold text-[#456057] hover:text-[#187b5b]">Quản trị</Link>}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-sm text-[#456057] sm:inline">{user.name}</span>
                {!user.is_verified && (
                  <button onClick={() => setVerificationOpen(true)} className="rounded-full border border-[#dce4dd] px-3 py-2 text-xs font-semibold text-[#187b5b]">
                    Xác thực SV
                  </button>
                )}
                {user.is_verified && <span className="hidden rounded-full bg-[#e6f3ec] px-3 py-2 text-xs font-bold text-[#187b5b] sm:inline">Sinh viên ✓</span>}
                <button onClick={() => void logout()} className="rounded-full px-3 py-2 text-sm font-semibold text-[#64766e] hover:bg-[#f1f4f0]">Thoát</button>
              </>
            ) : (
              <a href="/api/auth/google" className="rounded-full bg-[#187b5b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12664a]">
                {loaded ? 'Đăng nhập Google' : 'Đang tải...'}
              </a>
            )}
          </div>
        </div>
      </header>
      <StudentVerification
        open={verificationOpen}
        onClose={() => setVerificationOpen(false)}
        onVerified={onVerified}
      />
    </>
  );
}
