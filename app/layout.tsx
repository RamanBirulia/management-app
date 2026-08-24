import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://management-log.raman-birulia.chatgpt.site"),
  title: "Management Log & Planning",
  description: "Люди, проекты и управленческий контекст в одном персональном рабочем пространстве.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Management Log & Planning",
    description: "Люди, проекты и управленческий контекст.",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "Management Log & Planning" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Management Log & Planning",
    description: "Люди, проекты и управленческий контекст.",
    images: ["/og.png"],
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
