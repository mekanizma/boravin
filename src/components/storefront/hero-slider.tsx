"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";

export type HeroSliderSlide = {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  buttonLabel?: string;
};

const FALLBACK_SLIDES: HeroSliderSlide[] = [
  {
    id: "fallback-0",
    eyebrow: "",
    title: "",
    body: "",
    imageUrl:
      "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&h=675&q=75",
    linkUrl: "/urunler",
  },
  {
    id: "fallback-1",
    eyebrow: "",
    title: "",
    body: "",
    imageUrl:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&h=675&q=75",
    linkUrl: "/kategori/bilgisayar",
  },
  {
    id: "fallback-2",
    eyebrow: "",
    title: "",
    body: "",
    imageUrl:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&h=675&q=75",
    linkUrl: "/kampanya/yaz-teknoloji",
  },
];

export function HeroSlider({ slides }: { slides?: HeroSliderSlide[] }) {
  const t = useTranslations("Home");
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [broken, setBroken] = React.useState<Record<string, true>>({});

  const resolved = React.useMemo(() => {
    const fromCms = (slides ?? []).filter((slide) => {
      if (!slide.imageUrl) return false;
      const key = slide.id ?? slide.imageUrl;
      return !broken[key];
    });
    if (fromCms.length) return fromCms;

    return FALLBACK_SLIDES.map((slide, i) => ({
      ...slide,
      eyebrow: t(`slide${i}Eyebrow` as "slide0Eyebrow"),
      title: t(`slide${i}Title` as "slide0Title"),
      body: t(`slide${i}Body` as "slide0Body"),
      buttonLabel: t("heroCta"),
    }));
  }, [slides, t, broken]);

  React.useEffect(() => {
    setIndex(0);
  }, [resolved.length]);

  React.useEffect(() => {
    if (paused || resolved.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % resolved.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [paused, resolved.length]);

  const meta = resolved[index] ?? resolved[0];
  if (!meta) return null;

  const eyebrow = meta.eyebrow?.trim() || "";
  const title = meta.title?.trim() || "";
  const body = meta.body?.trim() || "";
  const linkUrl = meta.linkUrl?.trim() || "";
  const hasCopy = Boolean(eyebrow || title || body);
  const hasLink = Boolean(linkUrl);
  const ctaLabel = meta.buttonLabel?.trim() || t("heroCta");
  const slideKey = meta.id ?? meta.imageUrl;

  function go(next: number) {
    setIndex((next + resolved.length) % resolved.length);
  }

  return (
    <section
      className="bv-hero-band relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container-bv relative py-5 sm:py-7">
        <div className="bv-hero-slab bv-stage relative overflow-hidden rounded-[1.25rem] bg-[#1a1d22] text-white">
          <div className="relative aspect-[16/10] w-full sm:aspect-[2/1] lg:aspect-[21/9]">
            <SafeImage
              key={slideKey}
              src={meta.imageUrl}
              alt={title || eyebrow || ""}
              fill
              priority={index === 0}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1200px"
              className="object-cover object-center"
              fallbackSrc=""
              onLoadError={() => {
                setBroken((prev) =>
                  prev[slideKey] ? prev : { ...prev, [slideKey]: true },
                );
              }}
            />
            {hasCopy ? (
              <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/55 via-black/25 to-transparent">
                <div className="flex h-full flex-col justify-end p-5 sm:p-8 lg:max-w-[38rem] lg:justify-center lg:p-12">
                  {eyebrow ? (
                    <p className="text-[12px] font-bold tracking-[0.16em] text-[var(--bv-sale)] uppercase">
                      {eyebrow}
                    </p>
                  ) : null}
                  {title ? (
                    <h1 className="mt-2 text-[1.7rem] leading-[1.05] font-bold tracking-tight sm:text-4xl lg:text-5xl">
                      {title}
                    </h1>
                  ) : null}
                  {body ? (
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-white/95 sm:text-base">
                      {body}
                    </p>
                  ) : null}
                  {hasLink ? (
                    <Link
                      href={linkUrl}
                      className="bv-key bv-key-sea pointer-events-auto mt-6 inline-flex h-11 w-fit items-center rounded-xl bg-[var(--bv-teal)] px-5 text-sm font-semibold text-white"
                    >
                      {ctaLabel}
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : hasLink ? (
              <Link
                href={linkUrl}
                className="absolute inset-0 z-[1]"
                aria-label={ctaLabel}
              />
            ) : null}
          </div>

          {resolved.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute top-1/2 left-3 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black sm:inline-flex"
                aria-label={t("prevSlide")}
                onClick={() => go(index - 1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="absolute top-1/2 right-3 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black sm:inline-flex"
                aria-label={t("nextSlide")}
                onClick={() => go(index + 1)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                {resolved.map((item, i) => (
                  <button
                    key={item.id ?? `${item.imageUrl}-${i}`}
                    type="button"
                    aria-label={t("slideDot", {
                      eyebrow: item.eyebrow || item.title || String(i + 1),
                    })}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
