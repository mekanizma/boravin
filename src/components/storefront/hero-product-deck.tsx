"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductCardData } from "@/components/storefront/product-card";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/lib/i18n/format";

const AUTO_MS = 4500;

export function HeroProductDeck({
  products,
}: {
  products: ProductCardData[];
}) {
  const t = useTranslations("Home");
  const formatMoney = useFormatMoney();
  const list = products.filter((p) => p.imageUrl).slice(0, 6);
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const reduceMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    if (reduceMotion || paused || list.length < 2) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % list.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [list.length, paused, reduceMotion]);

  if (!list.length) return null;

  const product = list[active];
  const go = (dir: -1 | 1) => {
    setActive((i) => (i + dir + list.length) % list.length);
  };

  return (
    <div
      className="relative mx-auto w-full max-w-xl lg:ml-auto lg:max-w-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setPaused(false);
        }
      }}
    >
      <div className="relative">
        <Link
          href={`/urun/${product.slug}`}
          aria-label={`${product.brandName ? `${product.brandName} ` : ""}${product.name}`}
          className="group relative mx-auto block aspect-[4/5] w-full max-w-[20rem] overflow-hidden bg-[#e7ebef] sm:max-w-[22rem] lg:max-w-[24rem]"
        >
          <Image
            key={product.id}
            src={product.imageUrl!}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 80vw, 24rem"
            className={cn(
              "object-cover",
              !reduceMotion && "bv-hero-enter",
            )}
          />
          {product.isNew ? (
            <span className="absolute top-0 left-0 bg-[var(--bv-ink)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase">
              {t("heroDeckNew")}
            </span>
          ) : product.isCampaign ? (
            <span className="absolute top-0 left-0 bg-[var(--bv-teal)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase">
              {t("heroDeckCampaign")}
            </span>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#121417]/90 via-[#121417]/45 to-transparent p-4 text-white sm:p-5">
            {product.brandName ? (
              <p className="text-[10px] font-semibold tracking-[0.2em] text-white/70 uppercase">
                {product.brandName}
              </p>
            ) : null}
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="line-clamp-2 font-display text-lg font-semibold tracking-tight sm:text-xl">
                {product.name}
              </p>
              <p className="shrink-0 font-display text-lg font-semibold tracking-tight sm:text-xl">
                {formatMoney(Number(product.price))}
              </p>
            </div>
          </div>
        </Link>

        {list.length > 1 ? (
          <>
            <button
              type="button"
              aria-label={t("prevProduct")}
              onClick={() => go(-1)}
              className="absolute top-1/2 left-0 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/20 bg-[var(--bv-ink)]/70 text-white backdrop-blur-sm transition-colors hover:bg-[var(--bv-ink)] active:scale-[0.97] sm:left-2"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label={t("nextProduct")}
              onClick={() => go(1)}
              className="absolute top-1/2 right-0 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/20 bg-[var(--bv-ink)]/70 text-white backdrop-blur-sm transition-colors hover:bg-[var(--bv-ink)] active:scale-[0.97] sm:right-2"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </>
        ) : null}
      </div>

      {list.length > 1 ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {list.map((item, i) => {
            const selected = i === active;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={t("showProduct", { name: item.name })}
                aria-current={selected ? "true" : undefined}
                onClick={() => setActive(i)}
                className={cn(
                  "relative h-16 w-14 shrink-0 overflow-hidden bg-[#e7ebef] transition-opacity sm:h-[4.5rem] sm:w-16",
                  selected
                    ? "opacity-100 ring-2 ring-[var(--bv-teal)] ring-offset-2 ring-offset-[var(--bv-ink)]"
                    : "opacity-55 hover:opacity-90",
                )}
              >
                <Image
                  src={item.imageUrl!}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}
