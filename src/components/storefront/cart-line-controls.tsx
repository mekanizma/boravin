"use client";

import { Button } from "@/components/ui/button";
import {
  removeCartItem,
  updateCartItemQuantity,
} from "@/features/cart/actions";
import { useRouter } from "next/navigation";
import * as React from "react";

export function CartLineControls({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
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
        Sil
      </Button>
    </div>
  );
}
