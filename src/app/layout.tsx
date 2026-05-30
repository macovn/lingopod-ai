import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LingoPod AI",
  description: "Nền tảng SaaS học tiếng Anh bằng podcast và AI."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
