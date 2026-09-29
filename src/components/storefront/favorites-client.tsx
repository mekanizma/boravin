"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { readFavorites, toggleFavorite, type FavoriteItem } from "@/lib/favorites";
import { useFormatMoney } from "@/lib/i18n/format";

export function FavoritesClient() {
  const t = useTranslations("Favorites");
  const formatMoney = useFormatMoney();
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
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-sm text-[var(--bv-muted)]">{t("deviceNote")}</p>
      {items.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-[var(--bv-slate)]">{t("empty")}</p>
          <Link href="/urunler" className="mt-6 inline-block">
            <Button variant="accent">{t("discover")}</Button>
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
                  <SafeImage
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
                <p className="mt-1 text-sm font-semibold">{formatMoney(item.price)}</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-[var(--bv-muted)] underline-offset-2 hover:underline"
                  onClick={() => remove(item)}
                >
                  {t("remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
