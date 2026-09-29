import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return {
    title: {
      default: t("titleDefault"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    metadataBase: new URL(getAppUrl()),
    icons: {
      icon: "/boravin-logo.png",
      apple: "/boravin-logo.png",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable} h-full`}
    >
      <body className="min-h-full bg-[var(--bv-paper)] font-sans text-[var(--bv-ink)] antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
