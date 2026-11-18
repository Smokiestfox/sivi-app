"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function StudentVerificationForm({
  initiallyOpen = false,
  triggerLabel = "Xác thực SV",
}: {
  initiallyOpen?: boolean;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const titleId = useId();

  useEffect(() => {
    if (!open || !sentTo || !expiresAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [open, sentTo, expiresAt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await send(Boolean(sentTo));
  }

  async function send(verify: boolean) {
    if (busy) return;
    const target = sentTo || email.trim();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(verify ? "/api/auth/otp/verify" : "/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verify ? { email: target, otp } : { email: target }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Không thể xác thực email. Vui lòng thử lại.");
      } else if (verify) {
        setOpen(false);
        setSentTo("");
        setOtp("");
        router.refresh();
      } else {
        const duration = result.expiresInSeconds ?? 300;
        setExpiresAt(Date.now() + duration * 1000);
        setSecondsLeft(duration);
        setSentTo(target);
        setOtp("");
        setMessage(result.message);
      }
    } catch {
      setError("Không thể kết nối. Vui lòng thử lại.");
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
            aria-labelledby={titleId}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#187b5b]">Tài khoản sinh viên</p>
                <h2 id={titleId} className="mt-2 text-2xl font-bold text-[#18352d]">
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
            <form onSubmit={submit} className="mt-4 grid gap-3">
              {sentTo ? (
                <label className="grid gap-1 text-sm">
                  Mã OTP gửi đến {sentTo}
                  <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
                    maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value)}
                    className="rounded-xl border border-[#dce4dd] px-3 py-2" />
                </label>
              ) : (
                <label className="grid gap-1 text-sm">
                  Email trường
                  <input required type="email" autoComplete="email" maxLength={254} value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="rounded-xl border border-[#dce4dd] px-3 py-2" />
                </label>
              )}
              {message && <p role="status" className="text-sm">{message}</p>}
              {sentTo && <p className="text-sm tabular-nums text-[#64766e]">{secondsLeft > 0
                ? `Mã còn hiệu lực ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                : "Mã đã hết hạn. Hãy gửi lại mã."}</p>}
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={busy || Boolean(sentTo && secondsLeft === 0)}
                className="w-full rounded-xl bg-[#187b5b] px-4 py-3 font-bold text-white disabled:opacity-60">
                {busy ? "Đang xử lý…" : sentTo ? "Xác minh mã" : "Gửi mã OTP"}
              </button>
              {sentTo && (
                <div className="flex justify-center gap-4 text-sm font-semibold text-[#187b5b]">
                  <button type="button" disabled={busy} onClick={() => void send(false)}>Gửi lại mã</button>
                  <button type="button" disabled={busy}
                    onClick={() => { setSentTo(""); setOtp(""); setMessage(""); setError(""); }}>Đổi email</button>
                </div>
              )}
            </form>
          </section>
        </div>
      )}
    </>
  );
}
