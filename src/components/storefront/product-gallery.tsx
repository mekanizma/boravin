"use client";

import * as React from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";

export type GalleryImage = {
  id: string;
  url: string;
  alt: string;
};

export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const usable = React.useMemo(
    () => images.filter((image) => Boolean(image.url?.trim())),
    [images],
  );
  const [active, setActive] = React.useState(0);
  const current = usable[active] ?? usable[0];

  if (!current) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[1.35rem] bg-[var(--bv-fog)] text-sm text-[var(--bv-muted)]">
        Görsel yok
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[5.25rem_minmax(0,1fr)] sm:gap-5">
      {usable.length > 1 ? (
        <div className="order-2 flex gap-3 overflow-x-auto px-1 py-2 sm:order-1 sm:flex-col sm:overflow-visible">
          {usable.map((image, index) => {
            const selected = index === active;
            return (
              <button
                key={image.id}
                type="button"
                aria-label={`${index + 1}. görsel`}
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
          <div className="bv-plinth relative aspect-square overflow-hidden rounded-[1rem] sm:aspect-[4/5]">
            <SafeImage
              src={current.url}
              alt={current.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
            <div className="bv-detail-gloss" />
          </div>
        </div>
      </div>
    </div>
  );
}
