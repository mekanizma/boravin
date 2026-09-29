"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDES = [
  {
    eyebrow: "Hazır sistemler",
    title: "Seçilmiş sistemler, net fiyat",
    body: "Gaming ve ofis için hazırlanan kasalar. Parça listesi açık, stok mağazada.",
    href: "/urunler",
    image:
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1600&h=900&q=80",
  },
  {
    eyebrow: "Notebook",
    title: "Oyuncu ve iş laptopu aynı rafta",
    body: "ASUS, Apple ve günlük kullanım için seçilmiş dizüstüler.",
    href: "/kategori/bilgisayar",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1600&h=900&q=80",
  },
  {
    eyebrow: "Kampanya",
    title: "Bu haftanın teknoloji vitrini",
    body: "Seçili ürünlerde indirimli fiyat. Stok bitince liste kapanır.",
    href: "/kampanya/yaz-teknoloji",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&h=900&q=80",
  },
];

export function HeroSlider() {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [paused]);

  const slide = SLIDES[index];

  function go(next: number) {
    setIndex((next + SLIDES.length) % SLIDES.length);
  }

  return (
    <section
      className="bg-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container-bv py-4 sm:py-5">
        <div className="bv-hero-slab bv-stage relative overflow-hidden rounded-[1.25rem] bg-[#121417] text-white">
          <div className="relative min-h-[22rem] sm:min-h-[24rem] lg:min-h-[26rem]">
            <Image
              key={slide.image}
              src={slide.image}
              alt=""
              fill
              priority={index === 0}
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" />
            <div className="relative flex min-h-[22rem] flex-col justify-end p-5 sm:min-h-[24rem] sm:p-8 lg:min-h-[26rem] lg:max-w-[38rem] lg:justify-center lg:p-12">
              <p className="text-[12px] font-bold tracking-[0.16em] text-[var(--bv-sale)] uppercase">
                {slide.eyebrow}
              </p>
              <h1 className="mt-2 text-[1.7rem] leading-[1.05] font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {slide.title}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
                {slide.body}
              </p>
              <Link
                href={slide.href}
                className="bv-key bv-key-sea mt-6 inline-flex h-11 w-fit items-center rounded-xl bg-[var(--bv-teal)] px-5 text-sm font-semibold text-white"
              >
                Alışverişe başla
              </Link>
            </div>
          </div>

          <button
            type="button"
            className="absolute top-1/2 left-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black sm:inline-flex"
            aria-label="Önceki slayt"
            onClick={() => go(index - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute top-1/2 right-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black sm:inline-flex"
            aria-label="Sonraki slayt"
            onClick={() => go(index + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {SLIDES.map((item, i) => (
              <button
                key={item.eyebrow}
                type="button"
                aria-label={`${item.eyebrow} slaytı`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
