"use client";

import { useState } from "react";

export default function StudentVerificationForm({
  initiallyOpen = false,
  triggerLabel = "Xác thực SV",
}: {
  initiallyOpen?: boolean;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-[#dce4dd] px-4 py-2 text-sm font-bold text-[#187b5b] hover:bg-[#f1f5f0]"
      >
        {triggerLabel}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[#10271f]/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-verification-title"
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#187b5b]">Tài khoản sinh viên</p>
                <h2 id="student-verification-title" className="mt-2 text-2xl font-bold text-[#18352d]">
                  Xác thực email trường
                </h2>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1 text-xl text-[#64766e] hover:bg-[#f1f4f0]"
              >
                ×
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#64766e]">
              Luồng xác thực cần gửi và kiểm tra OTP qua dịch vụ backend. Các route
              `/api/auth/otp/request` và `/api/auth/otp/verify` chưa có trên nhánh này,
              nên chưa thể gửi mã hoặc thay đổi quyền tài khoản.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-xl bg-[#187b5b] px-4 py-3 font-bold text-white"
            >
              Đóng
            </button>
          </section>
        </div>
      )}
    </>
  );
}
