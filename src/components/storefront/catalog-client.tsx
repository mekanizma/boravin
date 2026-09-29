"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/storefront/product-grid";
import { FilterSidebar, type FilterGroup } from "@/components/storefront/filter-sidebar";
import { FilterDrawer } from "@/components/storefront/filter-drawer";
import type { ProductCardData } from "@/components/storefront/product-card";
import { categoryFilterGroups } from "@/lib/storefront/catalog";

const defaultGroups: FilterGroup[] = categoryFilterGroups();

export function CatalogClient({
  products,
  title,
  subtitle,
}: {
  products: ProductCardData[];
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");

  const filtered = React.useMemo(() => {
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;
    if (min == null && max == null) return products;
    return products.filter((product) => {
      const price = Number(product.price);
      if (min != null && !Number.isNaN(min) && price < min) return false;
      if (max != null && !Number.isNaN(max) && price > max) return false;
      return true;
    });
  }, [products, priceMin, priceMax]);

  function clearFilters() {
    setPriceMin("");
    setPriceMax("");
    router.push("/urunler", { scroll: false });
    setFilterOpen(false);
  }

  return (
    <div className="container-bv py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--bv-border)] pb-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--bv-muted)] uppercase">
            Katalog
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-[var(--bv-slate)]">{subtitle}</p>
          ) : null}
          <p className="mt-2 text-xs font-medium text-[var(--bv-muted)] tabular-nums">
            {filtered.length} ürün
          </p>
        </div>
        <Button
          variant="outline"
          className="lg:hidden"
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Kategoriler
        </Button>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[17.5rem_1fr] lg:gap-12">
        <FilterSidebar
          className="sticky top-28 hidden h-[calc(100dvh-8.5rem)] border border-[var(--bv-border)] p-4 lg:flex"
          groups={defaultGroups}
          onClear={clearFilters}
          priceMin={priceMin}
          priceMax={priceMax}
          onPriceChange={(min, max) => {
            setPriceMin(min);
            setPriceMax(max);
          }}
        />
        <div className="min-w-0">
          <ProductGrid products={filtered} />
        </div>
      </div>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        groups={defaultGroups}
        onClear={clearFilters}
        priceMin={priceMin}
        priceMax={priceMax}
        onPriceChange={(min, max) => {
          setPriceMin(min);
          setPriceMax(max);
        }}
        onNavigate={() => setFilterOpen(false)}
      />
    </div>
  );
}
