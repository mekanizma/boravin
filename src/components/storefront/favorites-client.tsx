"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Trash2, ArrowRight, GitCompareArrows } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { useToast } from "@/components/ui/toast";
import { FavoritesCompareModal } from "@/components/storefront/favorites-compare-modal";
import { addToCart } from "@/features/cart/actions";
import { isMockProductId } from "@/lib/mock/storefront";
import {
  clearFavorites,
  readFavorites,
  toggleFavorite,
  type FavoriteItem,
} from "@/lib/favorites";
import { useFormatMoney } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

const MAX_COMPARE = 4;

export function FavoritesClient() {
  const t = useTranslations("Favorites");
  const tToasts = useTranslations("Toasts");
  const formatMoney = useFormatMoney();
  const { toast } = useToast();
  const [items, setItems] = React.useState<FavoriteItem[]>([]);
  const [ready, setReady] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [compareOpen, setCompareOpen] = React.useState(false);

  React.useEffect(() => {
    setItems(readFavorites());
    setReady(true);
  }, []);

  const compareItems = React.useMemo(
    () => items.filter((item) => selected.includes(item.id)),
    [items, selected],
  );

  function refresh() {
    const next = readFavorites();
    setItems(next);
    setSelected((ids) => ids.filter((id) => next.some((item) => item.id === id)));
  }

  function remove(item: FavoriteItem) {
    toggleFavorite(item);
    refresh();
    toast({
      tone: "info",
      title: tToasts("favoriteRemoved"),
      description: item.name,
    });
  }

  function clearAll() {
    clearFavorites();
    setSelected([]);
    setCompareOpen(false);
    refresh();
    toast({
      tone: "info",
      title: t("clearedTitle"),
      description: t("clearedBody"),
    });
  }

  function toggleCompare(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id);
      if (current.length >= MAX_COMPARE) {
        toast({
          tone: "warning",
          title: t("compareLimitTitle"),
          description: t("compareLimitBody", { max: MAX_COMPARE }),
        });
        return current;
      }
      return [...current, id];
    });
  }

  async function onAdd(item: FavoriteItem) {
    if (isMockProductId(item.id)) {
      toast({
        tone: "info",
        title: tToasts("previewTitle"),
        description: tToasts("previewDesc"),
      });
      return;
    }
    setPendingId(item.id);
    try {
      await addToCart({ productId: item.id });
      window.dispatchEvent(new Event("bv-cart-changed"));
      window.dispatchEvent(new Event("bv-cart-open"));
      toast({
        tone: "success",
        title: tToasts("addedToCart"),
        description: item.name,
      });
    } catch {
      toast({
        tone: "error",
        title: tToasts("addFailed"),
        description: tToasts("addFailedCardDesc"),
      });
    } finally {
      setPendingId(null);
    }
  }

  const prices = compareItems.map((item) => item.price);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  return (
    <div className="bv-favorites-band relative overflow-hidden">
      <div className="bv-favorites-band__glow" aria-hidden />
      <div
        className={cn(
          "container-bv relative py-8 sm:py-12",
          selected.length > 0 && "pb-28",
        )}
      >
        <header className="flex flex-col gap-4 border-b border-[var(--bv-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--bv-teal)] uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight sm:text-[2.1rem]">
              {t("title")}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-[var(--bv-muted)]">
              {ready
                ? items.length > 0
                  ? t("countLabel", { count: items.length })
                  : t("deviceNote")
                : t("deviceNote")}
            </p>
          </div>
          {ready && items.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link href="/urunler">
                <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                  {t("continueShopping")}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-[var(--bv-muted)] sm:w-auto"
                onClick={clearAll}
              >
                {t("clearAll")}
              </Button>
            </div>
          ) : null}
        </header>

        {!ready ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-[0.9rem] bg-white/70"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 overflow-hidden rounded-[1.15rem] border border-[var(--bv-border)] bg-white">
            <div className="flex flex-col items-center px-6 py-12 text-center sm:px-10 sm:py-16">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bv-teal-soft)] text-[var(--bv-teal)]">
                <Heart className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {t("empty")}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--bv-muted)]">
                {t("emptyBody")}
              </p>
              <Link href="/urunler" className="mt-6">
                <Button variant="accent" className="gap-2">
                  {t("discover")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const checked = selected.includes(item.id);
              return (
                <li key={item.id}>
                  <article
                    className={cn(
                      "group relative flex h-full flex-col overflow-hidden rounded-[0.95rem] border bg-white shadow-[0_8px_20px_rgba(18,20,23,0.05)] transition-[border-color,box-shadow,transform] duration-200",
                      checked
                        ? "border-[var(--bv-sale)] shadow-[0_10px_24px_rgba(227,0,15,0.12)]"
                        : "border-[var(--bv-border)] hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(18,20,23,0.08)]",
                    )}
                  >
                    <div className="absolute top-2 left-2 z-10">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold tracking-wide text-[var(--bv-ink)] shadow-[0_4px_10px_rgba(18,20,23,0.12)] uppercase">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCompare(item.id)}
                          className="h-3.5 w-3.5 accent-[var(--bv-sale)]"
                          aria-label={t("compareSelectAria", { name: item.name })}
                        />
                        {t("compareShort")}
                      </label>
                    </div>

                    <Link
                      href={`/urun/${item.slug}`}
                      className="relative aspect-square overflow-hidden bg-[var(--bv-fog)]"
                    >
                      {item.imageUrl ? (
                        <SafeImage
                          src={item.imageUrl}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-[var(--bv-muted)]">
                          {item.name}
                        </span>
                      )}
                    </Link>

                    <div className="flex flex-1 flex-col gap-2.5 p-2.5 sm:p-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/urun/${item.slug}`}
                          className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--bv-ink)] transition-colors hover:text-[var(--bv-sale)]"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1.5 text-base font-semibold tabular-nums">
                          {formatMoney(item.price)}
                        </p>
                      </div>

                      <div className="mt-auto flex flex-col gap-1.5">
                        <button
                          type="button"
                          disabled={pendingId === item.id}
                          onClick={() => onAdd(item)}
                          className="bv-key inline-flex h-9 w-full items-center justify-center rounded-lg bg-[var(--bv-sale)] px-3 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {pendingId === item.id ? t("adding") : t("addToCart")}
                        </button>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Link
                            href={`/urun/${item.slug}`}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--bv-border-strong)] bg-white px-2 text-[11px] font-semibold text-[var(--bv-ink)] transition-colors hover:border-[var(--bv-ink)]"
                          >
                            {t("viewProduct")}
                          </Link>
                          <button
                            type="button"
                            onClick={() => remove(item)}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-medium text-[var(--bv-muted)] transition-colors hover:bg-[var(--bv-fog)] hover:text-[var(--bv-sale)]"
                          >
                            <Trash2 className="h-3 w-3" />
                            {t("removeShort")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--bv-border)] bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(18,20,23,0.1)] backdrop-blur-md sm:px-6">
          <div className="container-bv flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bv-sale-soft)] text-[var(--bv-sale)]">
                <GitCompareArrows className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--bv-ink)]">
                  {t("compareSelected", { count: selected.length })}
                </p>
                <p className="truncate text-xs text-[var(--bv-muted)]">
                  {t("compareHint", { max: MAX_COMPARE })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setSelected([])}
              >
                {t("compareClear")}
              </Button>
              <Button
                variant="accent"
                size="sm"
                className="flex-1 gap-1.5 sm:flex-none"
                disabled={selected.length < 2}
                onClick={() => setCompareOpen(true)}
              >
                <GitCompareArrows className="h-3.5 w-3.5" />
                {t("compareAction")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <FavoritesCompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        items={compareItems}
        pendingId={pendingId}
        onRemove={(id) => {
          setSelected((current) => {
            const next = current.filter((entry) => entry !== id);
            if (next.length < 2) setCompareOpen(false);
            return next;
          });
        }}
        onAdd={onAdd}
      />
    </div>
  );
}
