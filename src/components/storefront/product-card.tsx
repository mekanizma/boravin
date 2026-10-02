"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Heart, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { addToCart } from "@/features/cart/actions";
import { isMockProductId } from "@/lib/mock/storefront";
import { useToast } from "@/components/ui/toast";
import { CartAddButton } from "@/components/storefront/cart-add-button";
import { SafeImage } from "@/components/ui/safe-image";
import { useFormatMoney } from "@/lib/i18n/format";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  imageUrl?: string | null;
  hoverImageUrl?: string | null;
  isNew?: boolean;
  isCampaign?: boolean;
  isFeatured?: boolean;
  brandName?: string | null;
  aliases?: string[];
};

export function ProductCard({
  product,
  onFavorite,
  favorited = false,
}: {
  product: ProductCardData;
  onFavorite?: (id: string) => void;
  onQuickAdd?: (id: string) => void;
  favorited?: boolean;
}) {
  const { toast } = useToast();
  const t = useTranslations("Toasts");
  const tCommon = useTranslations("Common");
  const formatMoney = useFormatMoney();
  const [loading, setLoading] = React.useState(false);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
  const allowTilt = React.useRef(false);

  React.useEffect(() => {
    allowTilt.current =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!allowTilt.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setTilt({
      x: (0.5 - py) * 9,
      y: (px - 0.5) * 11,
    });
  }
  const price = Number(product.price);
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const discount =
    compare && compare > price
      ? Math.round(((compare - price) / compare) * 100)
      : null;
  const freeCargo = price >= 5000;

  async function onAdd() {
    if (isMockProductId(product.id)) {
      toast({
        tone: "info",
        title: t("previewTitle"),
        description: t("previewDesc"),
      });
      return;
    }
    setLoading(true);
    try {
      await addToCart({ productId: product.id });
      window.dispatchEvent(new Event("bv-cart-changed"));
      window.dispatchEvent(new Event("bv-cart-open"));
      toast({
        tone: "success",
        title: t("addedToCart"),
        description: product.name,
      });
    } catch {
      toast({
        tone: "error",
        title: t("addFailed"),
        description: t("addFailedCardDesc"),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      className="bv-stage h-full"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div
        className="bv-slab flex h-full flex-col p-2.5 sm:p-3"
        style={{ ["--rx" as string]: `${tilt.x}deg`, ["--ry" as string]: `${tilt.y}deg` }}
      >
        <div className="bv-plinth relative overflow-hidden rounded-[0.9rem]">
          {freeCargo ? (
            <span className="bv-float absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[9px] font-bold tracking-wide text-[#121417] shadow-[0_6px_12px_rgba(18,20,23,0.16)] sm:text-[10px]">
              <Truck className="h-3 w-3 text-[var(--bv-teal)]" strokeWidth={2.25} />
              {tCommon("freeShipping")}
            </span>
          ) : null}
          {onFavorite ? (
            <button
              type="button"
              className="bv-float absolute top-2 right-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#333] shadow-[0_6px_12px_rgba(18,20,23,0.16)]"
              aria-label={t("addFavoriteAria")}
              onClick={() => onFavorite(product.id)}
            >
              <Heart
                className={cn("h-4 w-4", favorited && "fill-[var(--bv-teal)] text-[var(--bv-teal)]")}
                strokeWidth={1.75}
              />
            </button>
          ) : (
            <Link
              href="/favoriler"
              prefetch={false}
              className="bv-float absolute top-2 right-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#333] shadow-[0_6px_12px_rgba(18,20,23,0.16)]"
              aria-label={tCommon("favorites")}
            >
              <Heart className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          )}
          <Link
            href={`/urun/${product.slug}`}
            prefetch={false}
            className="relative block aspect-square"
          >
            {product.imageUrl ? (
              <SafeImage
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center px-3 text-center text-xs text-[#999]">
                {tCommon("noImage")}
              </span>
            )}
          </Link>
          {discount ? (
            <span className="bv-float absolute bottom-2 left-2 rounded-full bg-[var(--bv-sale)] px-2 py-1 text-[11px] font-bold text-white shadow-[0_8px_14px_rgba(227,0,15,0.28)]">
              {tCommon("discountPercent", { percent: discount })}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col px-1 pt-3">
          {product.brandName ? (
            <p className="text-[11px] font-semibold tracking-wide text-[#7a8490] uppercase">
              {product.brandName}
            </p>
          ) : (
            <p className="text-[11px]" aria-hidden>
              &nbsp;
            </p>
          )}
          <Link
            href={`/urun/${product.slug}`}
            prefetch={false}
            className="mt-1 line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug font-semibold text-[#121417] sm:text-sm"
          >
            {product.name}
          </Link>
          <div className="mt-2 min-h-[2.6rem]">
            {compare && compare > price ? (
              <p className="text-[12px] text-[#98a1aa] line-through">{formatMoney(compare)}</p>
            ) : null}
            <p className="text-base font-bold tracking-tight text-[var(--bv-sale)] sm:text-lg">
              {formatMoney(price)}
            </p>
          </div>
          <CartAddButton
            pending={loading}
            onClick={onAdd}
            wrapClassName="mt-auto"
          />
        </div>
      </div>
    </article>
  );
}
