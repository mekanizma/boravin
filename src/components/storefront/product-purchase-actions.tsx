"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/features/cart/actions";
import { isFavorite, toggleFavorite, type FavoriteItem } from "@/lib/favorites";
import { useToast } from "@/components/ui/toast";
import { CartAddButton } from "@/components/storefront/cart-add-button";

export function ProductPurchaseActions({
  product,
  variantId,
  disabled = false,
}: {
  product: FavoriteItem;
  variantId?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saved, setSaved] = React.useState(false);
  const [pending, setPending] = React.useState<"cart" | "buy" | null>(null);

  React.useEffect(() => {
    setSaved(isFavorite(product.id));
  }, [product.id]);

  function onFavorite() {
    const nowSaved = toggleFavorite(product);
    setSaved(nowSaved);
    toast({
      tone: nowSaved ? "success" : "info",
      title: nowSaved ? "Favorilere eklendi" : "Favorilerden çıkarıldı",
      description: product.name,
    });
  }

  async function onAdd(buyNow: boolean) {
    setPending(buyNow ? "buy" : "cart");
    try {
      await addToCart({ productId: product.id, variantId });
      window.dispatchEvent(new Event("bv-cart-changed"));
      if (buyNow) {
        router.push("/odeme");
        return;
      }
      window.dispatchEvent(new Event("bv-cart-open"));
      toast({
        tone: "success",
        title: "Sepete eklendi",
        description: product.name,
      });
    } catch {
      toast({
        tone: "error",
        title: "Eklenemedi",
        description: "Ürün sepete eklenemedi. Lütfen tekrar deneyin.",
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-5 grid grid-cols-1 gap-2">
      <button
        type="button"
        className="bv-glitch-buy"
        data-label={pending === "buy" ? "Yönlendiriliyor" : "Satın al"}
        disabled={disabled || pending !== null}
        onClick={() => onAdd(true)}
      >
        {pending === "buy" ? "Yönlendiriliyor" : "Satın al"}
      </button>
      <CartAddButton
        pending={pending === "cart"}
        disabled={disabled || pending !== null}
        onClick={() => onAdd(false)}
      />
      <button
        type="button"
        lang="tr"
        className={saved ? "bv-fav-pill is-saved" : "bv-fav-pill"}
        disabled={disabled}
        aria-pressed={saved}
        onClick={onFavorite}
      >
        <span className="icon" aria-hidden>
          ❤️
        </span>
        <span className="title">{saved ? "Favorilerde" : "Favoriye ekle"}</span>
      </button>
    </div>
  );
}
