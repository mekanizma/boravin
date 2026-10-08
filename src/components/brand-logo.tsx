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
  md: { height: 40, className: "h-10 sm:h-11 md:h-12" },
  lg: { height: 52, className: "h-12 sm:h-14" },
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
  const width = Math.round(displayHeight * ASPECT);

  const image = (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center",
        useTextTagline ? undefined : s.className,
      )}
      style={
        useTextTagline
          ? {
              height: displayHeight,
              width: Math.round((displayHeight * ASPECT) / WORDMARK_RATIO),
            }
          : undefined
      }
    >
      <Image
        src="/boravin-logo.png"
        alt={t("logoAlt")}
        width={width}
        height={displayHeight}
        priority={priority}
        loading={priority ? "eager" : undefined}
        className={cn(
          "max-h-full w-auto max-w-[min(42vw,11.5rem)] object-contain object-left sm:max-w-[13rem]",
          useTextTagline ? "h-auto" : s.className,
        )}
        style={{ width: "auto", height: "auto" }}
      />
    </span>
  );

  const mark = (
    <span
      className={cn(
        "inline-flex max-w-full flex-col items-start leading-none",
        className,
      )}
    >
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
      className="inline-flex min-w-0 shrink-0 items-center overflow-visible leading-none"
    >
      {mark}
    </Link>
  );
}
