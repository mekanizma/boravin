"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { readFavorites, toggleFavorite, type FavoriteItem } from "@/lib/favorites";
import { formatCurrency } from "@/lib/utils";

export function FavoritesClient() {
  const [items, setItems] = React.useState<FavoriteItem[]>([]);

  React.useEffect(() => {
    setItems(readFavorites());
  }, []);

  function remove(item: FavoriteItem) {
    toggleFavorite(item);
    setItems(readFavorites());
  }

  return (
    <div className="container-bv py-8 sm:py-12">
      <h1 className="font-display text-3xl font-bold">Favoriler</h1>
      <p className="mt-2 text-sm text-[var(--bv-muted)]">
        Favoriler bu cihazda saklanır.
      </p>
      {items.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-[var(--bv-slate)]">Henüz favori ürün yok.</p>
          <Link href="/urunler" className="mt-6 inline-block">
            <Button variant="accent">Ürün keşfet</Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 border border-[var(--bv-border)] bg-white p-3"
            >
              <Link href={`/urun/${item.slug}`} className="relative h-20 w-20 shrink-0 bg-[var(--bv-concrete)]">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : null}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/urun/${item.slug}`} className="line-clamp-2 text-sm font-semibold">
                  {item.name}
                </Link>
                <p className="mt-1 text-sm font-semibold">{formatCurrency(item.price)}</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-[var(--bv-muted)] underline-offset-2 hover:underline"
                  onClick={() => remove(item)}
                >
                  Favorilerden çıkar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
