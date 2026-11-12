"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export default function StudentVerificationForm({
  initiallyOpen = false,
  triggerLabel = "Xác thực SV",
}: {
  initiallyOpen?: boolean;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verificationStarted, setVerificationStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!verificationStarted || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [verificationStarted, secondsLeft]);

  function readError(body: unknown, fallback: string) {
    return body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : fallback;
  }

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(readError(body, "Không thể gửi mã xác thực."));
        return;
      }
      const duration = body && typeof body === "object" && "expiresIn" in body && typeof body.expiresIn === "number"
        ? body.expiresIn
        : 300;
      setVerificationStarted(true);
      setSecondsLeft(duration);
      setNotice("Mã demo đã sẵn sàng: 123456. Mã có hiệu lực trong 5 phút.");
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || secondsLeft <= 0) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(readError(body, "Mã xác thực không hợp lệ."));
        return;
      }
      setOpen(false);
      setCode("");
      setNotice("");
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

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
            <p className="mt-4 text-sm leading-6 text-[#64766e]">Nhập email trường đã đăng ký trong hệ thống để nhận mã OTP demo. Email chỉ được liên kết với một tài khoản.</p>
            <form onSubmit={verificationStarted && secondsLeft > 0 ? verifyOtp : requestOtp} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-[#36564a]">
                Email trường
                <input
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={busy || verificationStarted}
                  placeholder="ten@hcmus.edu.vn"
                  className="mt-1.5 w-full rounded-xl border border-[#dce4dd] px-3.5 py-3 text-sm outline-none focus:border-[#187b5b] disabled:opacity-60"
                />
              </label>
              {verificationStarted && (
                <label className="block text-sm font-semibold text-[#36564a]">
                  Mã OTP
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    minLength={6}
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={busy || secondsLeft <= 0}
                    placeholder="6 chữ số"
                    className="mt-1.5 w-full rounded-xl border border-[#dce4dd] px-3.5 py-3 text-sm outline-none focus:border-[#187b5b] disabled:opacity-60"
                  />
                  <span className="mt-1 block text-xs font-normal text-[#819188]">
                    {secondsLeft > 0
                      ? `Mã hết hạn sau ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                      : "Mã đã hết hạn. Hãy yêu cầu mã mới."}
                  </span>
                </label>
              )}
              {notice && <p role="status" className="rounded-xl bg-[#e7f3ed] p-3 text-sm text-[#187b5b]">{notice}</p>}
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              {!verificationStarted || secondsLeft <= 0 ? (
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-[#187b5b] px-4 py-3 font-bold text-white disabled:opacity-60"
                >
                  {busy ? "Đang gửi..." : verificationStarted ? "Gửi mã mới" : "Gửi mã OTP"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={busy || code.length !== 6}
                  className="w-full rounded-xl bg-[#187b5b] px-4 py-3 font-bold text-white disabled:opacity-60"
                >
                  {busy ? "Đang xác thực..." : "Xác thực sinh viên"}
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="w-full rounded-xl border border-[#dce4dd] px-4 py-3 font-bold text-[#53685f] disabled:opacity-60">Đóng</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
