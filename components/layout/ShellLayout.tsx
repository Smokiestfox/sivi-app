import type { ReactNode } from "react";
import Link from "next/link";
import Header from "./Header";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
}