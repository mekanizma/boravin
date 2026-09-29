"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Native logo aspect ≈ 1025×400 (≈2.56:1). Tagline sits in the lower ~38%. */
const ASPECT = 1025 / 400;
const WORDMARK_RATIO = 0.62;

const SIZE = {
  sm: { height: 28, className: "h-7" },
  md: { height: 44, className: "h-11 sm:h-12" },
  lg: { height: 52, className: "h-[3.25rem] sm:h-14" },
} as const;

export function BrandLogo({
  href = "/",
  className,
  priority = false,
  size = "md",
}: {
  href?: string | null;
  className?: string;
  priority?: boolean;
  size?: keyof typeof SIZE;
}) {
  const t = useTranslations("SiteContact");
  const locale = useLocale();
  const s = SIZE[size];
  const useTextTagline = locale === "en";
  const displayHeight = useTextTagline
    ? Math.round(s.height * WORDMARK_RATIO)
    : s.height;
  const width = Math.round(s.height * ASPECT);

  const image = (
    <span
      className={cn(
        "relative inline-block overflow-hidden",
        useTextTagline ? undefined : s.className,
      )}
      style={
        useTextTagline
          ? { height: displayHeight, width: Math.round(displayHeight * ASPECT / WORDMARK_RATIO) }
          : undefined
      }
    >
      <Image
        src="/boravin-logo.png"
        alt={t("logoAlt")}
        width={width}
        height={s.height}
        priority={priority}
        className={cn(
          "object-contain object-left object-top",
          useTextTagline ? "h-auto w-full max-w-none" : cn(s.className, "w-auto"),
        )}
        style={
          useTextTagline
            ? { width: "100%", height: "auto", maxWidth: "none" }
            : { width: "auto", height: undefined }
        }
      />
    </span>
  );

  const mark = (
    <span className={cn("inline-flex flex-col items-start leading-none", className)}>
      {image}
      {useTextTagline ? (
        <span className="mt-0.5 max-w-[9.5rem] text-[9px] font-medium tracking-[0.02em] text-[#5c6570] sm:max-w-[11rem] sm:text-[10px]">
          {t("tagline")}
        </span>
      ) : null}
    </span>
  );

  if (href === null) {
    return mark;
  }

  return (
    <Link
      href={href}
      aria-label={t("homeAria")}
      className="inline-flex shrink-0 items-center leading-none"
    >
      {mark}
    </Link>
  );
}
