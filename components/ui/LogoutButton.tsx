"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      // Reload the document to discard cached pages from the previous session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch {
      setError("Không thể đăng xuất. Vui lòng thử lại.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={logout}
        className="rounded-full border border-[#dce4dd] px-4 py-2 text-sm font-bold text-[#64766e] disabled:opacity-60">
        {busy ? "Đang đăng xuất…" : "Đăng xuất"}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
