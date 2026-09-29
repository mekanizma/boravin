import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { getAppUrl } from "@/lib/env/app-url";
import "./globals.css";

const display = Inter_Tight({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700"],
});

const sans = Inter_Tight({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Boravin — Kıbrıs'ın Teknoloji Merkezi",
    template: "%s | Boravin",
  },
  description:
    "Boravin: Kıbrıs’ta elektronik, bilgisayar ve teknoloji ürünleri. Premium seçim, güvenilir alışveriş.",
  metadataBase: new URL(getAppUrl()),
  icons: {
    icon: "/boravin-logo.png",
    apple: "/boravin-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full bg-[var(--bv-paper)] font-sans text-[var(--bv-ink)] antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
