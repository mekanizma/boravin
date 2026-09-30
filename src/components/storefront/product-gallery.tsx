"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";

export type GalleryImage = {
  id: string;
  url: string;
  alt: string;
};

function useIsClient() {
  return React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const t = useTranslations("Product");
  const tCommon = useTranslations("Common");
  const isClient = useIsClient();
  const usable = React.useMemo(
    () => images.filter((image) => Boolean(image.url?.trim())),
    [images],
  );
  const [active, setActive] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const touchStartX = React.useRef<number | null>(null);
  const current = usable[active] ?? usable[0];
  const hasMany = usable.length > 1;

  const goPrev = React.useCallback(() => {
    setActive((index) => (index <= 0 ? usable.length - 1 : index - 1));
  }, [usable.length]);

  const goNext = React.useCallback(() => {
    setActive((index) => (index >= usable.length - 1 ? 0 : index + 1));
  }, [usable.length]);

  const closeLightbox = React.useCallback(() => {
    setLightboxOpen(false);
  }, []);

  React.useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft" && hasMany) goPrev();
      if (e.key === "ArrowRight" && hasMany) goNext();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen, closeLightbox, goPrev, goNext, hasMany]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null || !hasMany) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    if (delta > 0) goPrev();
    else goNext();
  }

  if (!current) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[1.35rem] bg-[var(--bv-fog)] text-sm text-[var(--bv-muted)]">
        {tCommon("noImage")}
      </div>
    );
  }

  const lightbox =
    isClient && lightboxOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex flex-col bg-[#0f1215]/92 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-label={t("galleryLightboxAria")}
            onClick={closeLightbox}
          >
            <div className="flex items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-5">
              <p className="text-sm font-medium text-white/80">
                {hasMany
                  ? t("galleryCounter", {
                      current: active + 1,
                      total: usable.length,
                    })
                  : current.alt}
              </p>
              <button
                type="button"
                onClick={closeLightbox}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label={tCommon("close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-16"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {hasMany ? (
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute top-1/2 left-1 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/22 sm:inline-flex"
                  aria-label={t("galleryPrev")}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              ) : null}

              <div className="relative h-[min(78dvh,920px)] w-full max-w-5xl">
                <SafeImage
                  src={current.url}
                  alt={current.alt}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              </div>

              {hasMany ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute top-1/2 right-1 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/22 sm:inline-flex"
                  aria-label={t("galleryNext")}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              ) : null}
            </div>

            {hasMany ? (
              <div className="flex items-center justify-center gap-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-white"
                  aria-label={t("galleryPrev")}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-white"
                  aria-label={t("galleryNext")}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[5.25rem_minmax(0,1fr)] sm:gap-5">
        {hasMany ? (
          <div className="order-2 flex gap-3 overflow-x-auto px-1 py-2 sm:order-1 sm:flex-col sm:overflow-visible">
            {usable.map((image, index) => {
              const selected = index === active;
              return (
                <button
                  key={image.id}
                  type="button"
                  aria-label={t("galleryImageAria", { index: index + 1 })}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => setActive(index)}
                  className={cn(
                    "bv-thumb-key relative h-16 w-16 shrink-0 overflow-hidden border bg-white sm:h-20 sm:w-20",
                    selected
                      ? "border-[var(--bv-teal)]"
                      : "border-transparent",
                  )}
                >
                  <SafeImage
                    src={image.url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="order-1 px-2 pt-2 pr-6 pb-8 sm:order-2">
          <div className="bv-detail-slab p-3 sm:p-4">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={t("galleryZoomAria")}
              className="bv-plinth group relative aspect-square w-full overflow-hidden rounded-[1rem] text-left sm:aspect-[4/5]"
            >
              <SafeImage
                src={current.url}
                alt={current.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover transition duration-300 group-hover:scale-[1.02]"
              />
              <div className="bv-detail-gloss" />
              <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-[#121417]/72 px-2.5 py-1.5 text-xs font-medium text-white opacity-90 backdrop-blur-sm sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                <ZoomIn className="h-3.5 w-3.5" />
                {t("galleryZoomHint")}
              </span>
            </button>
          </div>
        </div>
      </div>
      {lightbox}
    </>
  );
}
