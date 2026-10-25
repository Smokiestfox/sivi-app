import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ToastHost from "@/components/ToastHost";
import "antd/dist/reset.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SiVi - Cộng đồng sinh viên",
  description: "Tìm chỗ ở, kết nối bạn cùng nhà và khám phá địa điểm yêu thích cùng cộng đồng sinh viên.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
