"use client";

import * as React from "react";
import { CartAddButton } from "@/components/storefront/cart-add-button";
import { addToCart } from "@/features/cart/actions";
import { useToast } from "@/components/ui/toast";

export function AddToCartButton({
  productId,
  variantId,
}: {
  productId: string;
  variantId?: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  async function onAdd() {
    setLoading(true);
    try {
      await addToCart({ productId, variantId });
      window.dispatchEvent(new Event("bv-cart-changed"));
      window.dispatchEvent(new Event("bv-cart-open"));
      toast({
        tone: "success",
        title: "Sepete eklendi",
        description: "Ürün sepetinize eklendi.",
      });
    } catch {
      toast({
        tone: "error",
        title: "Eklenemedi",
        description: "Bir sorun oluştu. Lütfen tekrar deneyin.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <CartAddButton
      pending={loading}
      onClick={onAdd}
      wrapClassName="sm:flex-1"
    />
  );
}
