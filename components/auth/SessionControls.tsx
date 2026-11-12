"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DemoRole = "guest" | "student" | "admin";

const accounts: { role: DemoRole; label: string; detail: string }[] = [
  { role: "guest", label: "Guest", detail: "Tài khoản chưa xác thực" },
  { role: "student", label: "Sinh viên", detail: "Đã xác thực email trường" },
  { role: "admin", label: "Admin", detail: "Quyền quản trị báo cáo" },
];

export function LoginButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function login(role: DemoRole) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/demo", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error
          : "Không thể đăng nhập demo.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Hãy kiểm tra ứng dụng và cơ sở dữ liệu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-[#187b5b] px-4 py-2 text-sm font-bold text-white hover:bg-[#126448]"
      >
        Đăng nhập
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[#10271f]/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (!busy && event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-login-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#187b5b]">Chào mừng đến SiVi</p>
                <h2 id="demo-login-title" className="mt-2 text-2xl font-bold text-[#18352d]">Đăng nhập demo</h2>
              </div>
              <button type="button" aria-label="Đóng" onClick={() => setOpen(false)} className="rounded-full px-3 py-1 text-xl text-[#64766e] hover:bg-[#f1f4f0]">×</button>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#64766e]">
              OAuth Google thật chưa được cấu hình. Chọn vai trò để thử các luồng trong môi trường local.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void login("guest")}
              className="mt-5 w-full rounded-xl bg-[#187b5b] px-4 py-3 font-bold text-white disabled:opacity-60"
            >
              Tiếp tục với Google (Tài khoản Demo)
            </button>
            <p className="mt-6 text-xs font-bold uppercase tracking-wide text-[#819188]">Hoặc chọn tài khoản thử nghiệm</p>
            <div className="mt-3 grid gap-2">
              {accounts.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  disabled={busy}
                  onClick={() => void login(account.role)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#dce4dd] px-4 py-3 text-left hover:bg-[#f7f8f5] disabled:opacity-60"
                >
                  <span className="font-bold text-[#18352d]">{account.label}</span>
                  <span className="text-xs text-[#64766e]">{account.detail}</span>
                </button>
              ))}
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
          </section>
        </div>
      )}
    </>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) {
        window.alert("Không thể đăng xuất lúc này. Vui lòng thử lại.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      window.alert("Không thể kết nối máy chủ để đăng xuất.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void logout()}
      className="rounded-full border border-[#dce4dd] px-4 py-2 text-sm font-bold text-[#53685f] hover:bg-[#f1f5f0] disabled:opacity-60"
    >
      {busy ? "Đang đăng xuất..." : "Đăng xuất"}
    </button>
  );
}
