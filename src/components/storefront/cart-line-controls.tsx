"use client";

import { Button } from "@/components/ui/button";
import {
  removeCartItem,
  updateCartItemQuantity,
} from "@/features/cart/actions";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";

export function CartLineControls({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}) {
  const t = useTranslations("Cart");
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        aria-label={t("decreaseQty")}
        onClick={() =>
          start(async () => {
            await updateCartItemQuantity(itemId, quantity - 1);
            window.dispatchEvent(new Event("bv-cart-changed"));
            router.refresh();
          })
        }
      >
        −
      </Button>
      <span className="w-8 text-center text-sm">{quantity}</span>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        aria-label={t("increaseQty")}
        onClick={() =>
          start(async () => {
            await updateCartItemQuantity(itemId, quantity + 1);
            window.dispatchEvent(new Event("bv-cart-changed"));
            router.refresh();
          })
        }
      >
        +
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await removeCartItem(itemId);
            window.dispatchEvent(new Event("bv-cart-changed"));
            router.refresh();
          })
        }
      >
        {t("delete")}
      </Button>
    </div>
  );
}
