"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";

export default function AdminLoginDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      onCancel={(event) => event.preventDefault()}
      className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border-0 bg-white p-6 text-[#18352d] shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-[2px] sm:p-8"
    >
      <p className="text-sm font-semibold text-[#187b5b]">Quản trị SiVi</p>
      <h2 id={titleId} className="mt-2 text-2xl font-bold">Đăng nhập để tiếp tục</h2>
      <p id={descriptionId} className="mt-3 text-sm leading-6 text-[#53685f]">
        Sử dụng tài khoản Google có quyền quản trị để vào trang báo cáo.
      </p>
      <a
        href="/api/auth/google"
        className="mt-6 block rounded-xl bg-[#187b5b] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#12664a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#187b5b]"
      >
        Đăng nhập Google
      </a>
      <Link href="/" className="mt-3 block rounded-xl px-4 py-2 text-center text-sm font-semibold text-[#53685f] hover:bg-[#f7f8f5]">
        Về trang chủ
      </Link>
    </dialog>
  );
}
