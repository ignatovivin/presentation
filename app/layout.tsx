import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BrowserExtensionCleaner } from "@/components/browser-extension-cleaner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Конструктор презентаций с ИИ",
  description: "Создавайте потрясающие презентации с помощью ИИ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <BrowserExtensionCleaner />
        {children}
      </body>
    </html>
  );
}
