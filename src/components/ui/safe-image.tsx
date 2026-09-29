"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

const FALLBACK =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&h=1000&q=80";

function resolveSrc(src: ImageProps["src"] | null | undefined) {
  if (!src || typeof src !== "string") return FALLBACK;
  const trimmed = src.trim();
  if (!trimmed) return FALLBACK;
  if (trimmed.startsWith("/uploads/")) return FALLBACK;
  return trimmed;
}

function isCdnDirect(src: string) {
  return (
    src.includes("images.unsplash.com") ||
    src.includes("picsum.photos") ||
    src.includes("images.icecat.biz")
  );
}

export type SafeImageProps = Omit<ImageProps, "onError" | "src"> & {
  src?: ImageProps["src"] | null;
  fallbackSrc?: string;
};

/**
 * next/image wrapper: CDN images load directly (no Render proxy hop),
 * broken sources fall back without crashing the page.
 */
export function SafeImage({
  src,
  fallbackSrc = FALLBACK,
  alt,
  className,
  ...rest
}: SafeImageProps) {
  const initial = resolveSrc(src);
  const [current, setCurrent] = React.useState(initial);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setCurrent(resolveSrc(src));
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <span
        className={cn(
          "flex items-center justify-center bg-[var(--bv-fog)] text-xs text-[var(--bv-muted)]",
          className,
        )}
        aria-label={alt || "Görsel yok"}
      />
    );
  }

  const cdn = typeof current === "string" && isCdnDirect(current);

  return (
    <Image
      {...rest}
      alt={alt}
      src={current}
      className={className}
      unoptimized={cdn || rest.unoptimized}
      loading={rest.priority ? undefined : (rest.loading ?? "lazy")}
      onError={() => {
        if (current !== fallbackSrc) {
          setCurrent(fallbackSrc);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
