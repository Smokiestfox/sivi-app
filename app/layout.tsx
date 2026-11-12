import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ShellLayout from "@/components/layout/ShellLayout";

export const metadata: Metadata = {
  title: "SiVi",
  description: "Nền tảng forum tìm roommate và review địa điểm cho sinh viên.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
