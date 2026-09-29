"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { formatCurrency } from "@/lib/utils";
import {
  removeCartItem,
  updateCartItemQuantity,
} from "@/features/cart/actions";

export type CartDrawerItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number | string;
  imageUrl?: string | null;
  href?: string;
};

const FREE_SHIP_AT = 5000;

function CartQtyControls({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}) {
  const [pending, start] = React.useTransition();

  function refreshCart() {
    window.dispatchEvent(new Event("bv-cart-changed"));
  }

  return (
    <div className="inline-flex items-center border border-[var(--bv-border-strong)]">
      <button
        type="button"
        disabled={pending}
        aria-label="Adeti azalt"
        className="inline-flex h-8 w-8 items-center justify-center text-[var(--bv-ink)] transition-colors hover:bg-[var(--bv-fog)] disabled:opacity-40"
        onClick={() =>
          start(async () => {
            await updateCartItemQuantity(itemId, quantity - 1);
            refreshCart();
          })
        }
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <span className="w-8 text-center text-[13px] font-semibold tabular-nums">
        {quantity}
      </span>
      <button
        type="button"
        disabled={pending}
        aria-label="Adeti artır"
        className="inline-flex h-8 w-8 items-center justify-center text-[var(--bv-ink)] transition-colors hover:bg-[var(--bv-fog)] disabled:opacity-40"
        onClick={() =>
          start(async () => {
            await updateCartItemQuantity(itemId, quantity + 1);
            refreshCart();
          })
        }
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

export function CartDrawer({
  open,
  onClose,
  items = [],
}: {
  open: boolean;
  onClose: () => void;
  items?: CartDrawerItem[];
}) {
  const router = useRouter();
  const [removing, startRemove] = React.useTransition();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );
  const shipProgress = Math.min(100, (total / FREE_SHIP_AT) * 100);
  const shipRemaining = Math.max(0, FREE_SHIP_AT - total);
  const freeShip = total >= FREE_SHIP_AT;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      bodyClassName="p-0"
      title={
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--bv-muted)] uppercase">
            Alışveriş
          </p>
          <h2 className="mt-0.5 font-display text-lg font-semibold tracking-tight text-[var(--bv-ink)]">
            Sepet
            {itemCount > 0 ? (
              <span className="ml-2 align-middle text-sm font-semibold text-[var(--bv-sale)]">
                ({itemCount})
              </span>
            ) : null}
          </h2>
        </div>
      }
      footer={
        items.length > 0 ? (
          <div className="space-y-3 px-5 py-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--bv-muted)] uppercase">
                  Ara toplam
                </p>
                <p className="mt-0.5 text-xs text-[var(--bv-muted)]">
                  KDV dahil · {itemCount} ürün
                </p>
              </div>
              <p className="font-display text-xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(total)}
              </p>
            </div>
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center bg-[var(--bv-sale)] text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-[var(--bv-sale-hover)]"
              onClick={() => {
                onClose();
                router.push("/odeme");
              }}
            >
              Ödemeye geç
            </button>
            <Link
              href="/sepet"
              onClick={onClose}
              className="flex h-11 w-full items-center justify-center border border-[var(--bv-border-strong)] text-sm font-semibold text-[var(--bv-ink)] transition-colors hover:border-[var(--bv-ink)] hover:bg-[var(--bv-fog)]"
            >
              Sepeti görüntüle
            </Link>
          </div>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="flex h-full min-h-[22rem] flex-col items-center justify-center px-6 py-16 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center bg-[var(--bv-fog)] text-[var(--bv-muted)]">
            <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">
            Sepetiniz boş
          </h3>
          <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-[var(--bv-muted)]">
            Keşfetmeye devam edin, beğendiğiniz ürünleri sepete ekleyin.
          </p>
          <button
            type="button"
            className="mt-6 inline-flex h-11 items-center justify-center bg-[var(--bv-ink)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--bv-graphite)]"
            onClick={() => {
              onClose();
              router.push("/urunler");
            }}
          >
            Ürünlere git
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="border-b border-[var(--bv-border)] bg-[var(--bv-fog)] px-5 py-3">
            <div className="flex items-start gap-2.5">
              <Truck
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bv-sale)]"
                strokeWidth={2}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[var(--bv-ink)]">
                  {freeShip
                    ? "Kargo bedava"
                    : `${formatCurrency(shipRemaining)} daha · kargo bedava`}
                </p>
                <div className="mt-2 h-1 overflow-hidden bg-[var(--bv-border)]">
                  <div
                    className="h-full bg-[var(--bv-sale)] transition-[width] duration-500 ease-out"
                    style={{ width: `${shipProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <ul className="divide-y divide-[var(--bv-border)]">
            {items.map((item) => {
              const lineTotal = Number(item.unitPrice) * item.quantity;
              return (
                <li key={item.id} className="flex gap-3.5 px-5 py-4">
                  <Link
                    href={item.href ?? "/sepet"}
                    onClick={onClose}
                    className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden bg-[var(--bv-concrete)]"
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-[var(--bv-muted)]">
                        Görsel yok
                      </span>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={item.href ?? "/sepet"}
                        className="line-clamp-2 text-[13px] leading-snug font-semibold text-[var(--bv-ink)] hover:text-[var(--bv-sale)]"
                        onClick={onClose}
                      >
                        {item.name}
                      </Link>
                      <button
                        type="button"
                        disabled={removing}
                        aria-label={`${item.name} ürününü sil`}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[var(--bv-muted)] transition-colors hover:text-[var(--bv-sale)] disabled:opacity-40"
                        onClick={() =>
                          startRemove(async () => {
                            await removeCartItem(item.id);
                            window.dispatchEvent(new Event("bv-cart-changed"));
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>

                    <p className="mt-1 text-[12px] text-[var(--bv-muted)]">
                      {formatCurrency(item.unitPrice)} / adet
                    </p>

                    <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                      <CartQtyControls
                        itemId={item.id}
                        quantity={item.quantity}
                      />
                      <p className="text-sm font-bold tabular-nums text-[var(--bv-ink)]">
                        {formatCurrency(lineTotal)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Drawer>
  );
}
