"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/utils";
import { ProductPurchaseActions } from "@/components/storefront/product-purchase-actions";
import { DetailCard } from "@/components/storefront/detail-card";
import type { FavoriteItem } from "@/lib/favorites";

type BuyVariant = {
  id: string;
  name: string;
  price: number | null;
  stock: number;
};

export function ProductBuyPanel({
  product,
  basePrice,
  compareAtPrice,
  stock,
  variants,
}: {
  product: FavoriteItem;
  basePrice: number;
  compareAtPrice: number | null;
  stock: number;
  variants: BuyVariant[];
}) {
  const activeVariants = variants.filter((variant) => variant.stock >= 0);
  const [variantId, setVariantId] = React.useState<string | undefined>(
    activeVariants[0]?.id,
  );
  const selected = activeVariants.find((variant) => variant.id === variantId);
  const price = selected?.price ?? basePrice;
  const available = selected ? selected.stock : stock;
  const compare =
    compareAtPrice && compareAtPrice > price ? compareAtPrice : null;
  const discount = compare
    ? Math.round(((compare - price) / compare) * 100)
    : null;

  return (
    <DetailCard className="p-3.5 sm:p-4" stageClassName="mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="bv-float">
          {compare ? (
            <p className="text-sm text-[var(--bv-muted)] line-through">
              {formatCurrency(compare)}
            </p>
          ) : null}
          <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {formatCurrency(price)}
          </p>
        </div>
        {discount ? (
          <p className="bv-float rounded-full bg-[var(--bv-sale)] px-3 py-1 text-xs font-bold text-white shadow-[0_8px_14px_rgba(227,0,15,0.28)]">
            %{discount} indirim
          </p>
        ) : null}
      </div>

      <p className="mt-2.5 text-sm text-[var(--bv-slate)]">
        {available > 0
          ? available <= 8
            ? `Stokta · son ${available} ürün`
            : "Stokta"
          : "Tükendi"}
        {price >= 5000 ? " · Kargo bedava" : " · 5.000 TL üzeri kargo bedava"}
      </p>

      {activeVariants.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--bv-muted)] uppercase">
            Seçenek
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activeVariants.map((variant) => {
              const on = variant.id === variantId;
              return (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={on}
                  disabled={variant.stock <= 0}
                  onClick={() => setVariantId(variant.id)}
                  className={
                    on
                      ? "bv-key h-10 rounded-xl bg-[var(--bv-sale)] px-3.5 text-sm font-semibold text-white"
                      : "bv-key-line h-10 rounded-xl border border-[var(--bv-border-strong)] bg-white px-3.5 text-sm font-medium text-[var(--bv-ink)] disabled:opacity-40"
                  }
                >
                  {variant.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <ProductPurchaseActions
        product={{ ...product, price }}
        variantId={selected?.id}
        disabled={available <= 0}
      />
    </DetailCard>
  );
}
