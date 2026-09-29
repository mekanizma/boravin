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
  // Local uploads are not on Render unless the file was re-uploaded to the disk.
  if (trimmed.startsWith("/uploads/")) return FALLBACK;
  return trimmed;
}

export type SafeImageProps = Omit<ImageProps, "onError" | "src"> & {
  src?: ImageProps["src"] | null;
  fallbackSrc?: string;
};

/**
 * next/image wrapper that swaps to a stable remote fallback when the source 404s
 * or points at a missing local /uploads path (common on Render).
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

  return (
    <Image
      {...rest}
      alt={alt}
      src={current}
      className={className}
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
