"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { SafeImage } from "@/components/ui/safe-image";
import {
  getProductsForCompare,
  type CompareProduct,
} from "@/features/products/actions";
import type { FavoriteItem } from "@/lib/favorites";
import { publicImageUrl } from "@/lib/media/url";
import { useFormatMoney } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

function asCompareProduct(item: FavoriteItem): CompareProduct {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    sku: "—",
    price: item.price,
    compareAtPrice: null,
    stock: -1,
    brandName: null,
    categoryName: null,
    imageUrl: item.imageUrl ?? null,
    shortDescription: null,
  };
}

export function FavoritesCompareModal({
  open,
  onClose,
  items,
  pendingId,
  onRemove,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  items: FavoriteItem[];
  pendingId: string | null;
  onRemove: (id: string) => void;
  onAdd: (item: FavoriteItem) => void;
}) {
  const t = useTranslations("Favorites");
  const tCommon = useTranslations("Common");
  const formatMoney = useFormatMoney();
  const [rows, setRows] = React.useState<CompareProduct[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || items.length < 2) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const fallback = items.map(asCompareProduct);
    setRows(fallback);

    void getProductsForCompare(items.map((item) => item.id))
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded.length) {
          setRows(fallback);
          return;
        }
        const order = new Map(items.map((item, index) => [item.id, index]));
        const merged = items.map((item) => {
          const rich = loaded.find((entry) => entry.id === item.id);
          if (!rich) return asCompareProduct(item);
          return {
            ...rich,
            imageUrl: rich.imageUrl || item.imageUrl || null,
            name: rich.name || item.name,
            price: rich.price || item.price,
          };
        });
        merged.sort(
          (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
        );
        setRows(merged);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, items]);

  const prices = rows.map((row) => row.price);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const colCount = Math.max(rows.length, 1);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("compareTitle")}
      className="sm:max-w-5xl"
    >
      {rows.length < 2 ? (
        <p className="text-sm text-[var(--bv-muted)]">{t("compareNeedTwo")}</p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div
            className={cn(
              "min-w-[34rem] overflow-hidden rounded-[1rem] border border-[var(--bv-border)] bg-white",
              loading && "opacity-90",
            )}
          >
            <div
              className="grid border-b border-[var(--bv-border)] bg-[var(--bv-fog)]/35"
              style={{
                gridTemplateColumns: `7.5rem repeat(${colCount}, minmax(11rem, 1fr))`,
              }}
            >
              <div className="px-3 py-4 text-xs font-semibold tracking-[0.12em] text-[var(--bv-muted)] uppercase">
                {t("compareProductsLabel")}
              </div>
              {rows.map((item) => {
                const best =
                  minPrice === item.price && minPrice !== maxPrice;
                return (
                  <div
                    key={item.id}
                    className="relative border-l border-[var(--bv-border)] px-3 py-3"
                  >
                    <button
                      type="button"
                      className="absolute top-2 right-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--bv-muted)] shadow-[0_4px_10px_rgba(18,20,23,0.12)] transition hover:text-[var(--bv-sale)]"
                      aria-label={t("compareRemoveAria", { name: item.name })}
                      onClick={() => onRemove(item.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <Link
                      href={`/urun/${item.slug}`}
                      onClick={onClose}
                      className="relative mx-auto block aspect-square w-full max-w-[9.5rem] overflow-hidden rounded-[0.75rem] bg-white"
                    >
                      {item.imageUrl ? (
                        <SafeImage
                          src={publicImageUrl(item.imageUrl) ?? item.imageUrl}
                          alt=""
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      ) : null}
                    </Link>
                    <Link
                      href={`/urun/${item.slug}`}
                      onClick={onClose}
                      className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-[var(--bv-ink)] hover:text-[var(--bv-sale)]"
                    >
                      {item.name}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p
                        className={cn(
                          "text-lg font-semibold tabular-nums",
                          best && "text-[var(--bv-success)]",
                        )}
                      >
                        {formatMoney(item.price)}
                      </p>
                      {best ? (
                        <span className="rounded-full bg-[var(--bv-success)]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--bv-success)] uppercase">
                          {t("compareBestPrice")}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-col gap-1.5">
                      <button
                        type="button"
                        disabled={pendingId === item.id}
                        onClick={() =>
                          onAdd({
                            id: item.id,
                            name: item.name,
                            slug: item.slug,
                            price: item.price,
                            imageUrl: item.imageUrl,
                          })
                        }
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--bv-sale)] px-3 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {pendingId === item.id ? t("adding") : t("addToCart")}
                      </button>
                      <Link
                        href={`/urun/${item.slug}`}
                        onClick={onClose}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--bv-border-strong)] text-xs font-semibold text-[var(--bv-ink)] hover:border-[var(--bv-ink)]"
                      >
                        {t("viewProduct")}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {(
              [
                {
                  key: "listPrice",
                  label: t("compareRowListPrice"),
                  render: (item: CompareProduct) =>
                    item.compareAtPrice && item.compareAtPrice > item.price
                      ? formatMoney(item.compareAtPrice)
                      : "—",
                },
                {
                  key: "brand",
                  label: t("compareRowBrand"),
                  render: (item: CompareProduct) => item.brandName || "—",
                },
                {
                  key: "category",
                  label: t("compareRowCategory"),
                  render: (item: CompareProduct) => item.categoryName || "—",
                },
                {
                  key: "stock",
                  label: t("compareRowStock"),
                  render: (item: CompareProduct) => {
                    if (item.stock < 0) return "—";
                    if (item.stock <= 0) return tCommon("outOfStock");
                    return tCommon("stockCount", { count: item.stock });
                  },
                },
                {
                  key: "sku",
                  label: t("compareRowSku"),
                  render: (item: CompareProduct) => item.sku || "—",
                },
              ] as const
            ).map((row, index) => (
              <div
                key={row.key}
                className={cn(
                  "grid",
                  index % 2 === 0 ? "bg-white" : "bg-[var(--bv-fog)]/25",
                )}
                style={{
                  gridTemplateColumns: `7.5rem repeat(${colCount}, minmax(11rem, 1fr))`,
                }}
              >
                <div className="flex items-center px-3 py-3 text-xs font-medium text-[var(--bv-muted)]">
                  {row.label}
                </div>
                {rows.map((item) => (
                  <div
                    key={`${row.key}-${item.id}`}
                    className="border-l border-[var(--bv-border)] px-3 py-3 text-sm font-medium text-[var(--bv-ink)]"
                  >
                    {row.render(item)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
