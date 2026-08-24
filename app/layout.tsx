import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Management Log",
  description: "Personal management context, decisions, and planning.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
