"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setStorefrontLocale } from "@/features/locale/actions";
import { locales, type AppLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  className,
  compact = false,
  tone = "onBrand",
}: {
  className?: string;
  compact?: boolean;
  /** onBrand = white text (promo bar); onSurface = dark text (drawer) */
  tone?: "onBrand" | "onSurface";
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Locale");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const onChange = (next: AppLocale) => {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setStorefrontLocale(next);
      router.refresh();
    });
  };

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      role="group"
      aria-label={t("switchTo")}
    >
      {locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            disabled={pending}
            aria-pressed={active}
            onClick={() => onChange(code)}
            className={cn(
              "min-h-8 rounded px-1.5 text-[12px] font-medium transition-colors disabled:opacity-60",
              tone === "onBrand" &&
                (active
                  ? "text-white underline decoration-white/80 underline-offset-4"
                  : "text-white/70 hover:text-white"),
              tone === "onSurface" &&
                (active
                  ? "text-[#121417] underline decoration-[#121417]/50 underline-offset-4"
                  : "text-[#667] hover:text-[#121417]"),
              compact && "min-h-11 px-2 text-sm",
            )}
          >
            {compact ? t(code) : code === "tr" ? "TR" : "EN"}
          </button>
        );
      })}
    </div>
  );
}
