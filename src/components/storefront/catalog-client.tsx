"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/storefront/product-grid";
import { FilterSidebar, type FilterGroup } from "@/components/storefront/filter-sidebar";
import { FilterDrawer } from "@/components/storefront/filter-drawer";
import type { ProductCardData } from "@/components/storefront/product-card";
import { categoryFilterGroups } from "@/lib/storefront/catalog";
import {
  parseCatalogSort,
  sortProductCards,
  type CatalogSort,
} from "@/lib/storefront/catalog-sort";

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
  const t = useTranslations("Catalog");
  const tFilters = useTranslations("Filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");

  const sort = parseCatalogSort(searchParams.get("sort"));

  function replaceQuery(next: { sort?: CatalogSort; clearAll?: boolean }) {
    const params = new URLSearchParams(
      next.clearAll ? undefined : searchParams.toString(),
    );
    if (next.clearAll) {
      router.push(pathname === "/urunler" ? "/urunler" : pathname, {
        scroll: false,
      });
      return;
    }
    if (next.sort === "recommended" || next.sort === undefined) {
      params.delete("sort");
    } else if (next.sort) {
      params.set("sort", next.sort);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function setSort(next: CatalogSort) {
    replaceQuery({ sort: next });
  }

  const filtered = React.useMemo(() => {
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;
    let list = products;
    if (min != null || max != null) {
      list = products.filter((product) => {
        const price = Number(product.price);
        if (min != null && !Number.isNaN(min) && price < min) return false;
        if (max != null && !Number.isNaN(max) && price > max) return false;
        return true;
      });
    }
    return sortProductCards(list, sort);
  }, [products, priceMin, priceMax, sort]);

  function clearFilters() {
    setPriceMin("");
    setPriceMax("");
    replaceQuery({ clearAll: true });
    setFilterOpen(false);
  }

  return (
    <div className="container-bv py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--bv-border)] pb-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--bv-muted)] uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-[var(--bv-slate)]">{subtitle}</p>
          ) : null}
          <p className="mt-2 text-xs font-medium text-[var(--bv-muted)] tabular-nums">
            {t("productCount", { count: filtered.length })}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <label className="flex min-w-[11rem] flex-col gap-1 lg:hidden">
            <span className="text-[11px] font-semibold tracking-[0.12em] text-[var(--bv-muted)] uppercase">
              {tFilters("sort")}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(parseCatalogSort(e.target.value))}
              className="h-10 w-full border border-[var(--bv-border-strong)] bg-white px-2.5 text-[13px] font-medium text-[var(--bv-ink)]"
              aria-label={tFilters("sort")}
            >
              <option value="recommended">{tFilters("sortRecommended")}</option>
              <option value="price_asc">{tFilters("sortPriceAsc")}</option>
              <option value="price_desc">{tFilters("sortPriceDesc")}</option>
            </select>
          </label>
          <Button
            variant="outline"
            className="w-full sm:w-auto lg:hidden"
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("categoriesButton")}
          </Button>
        </div>
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
          sort={sort}
          onSortChange={setSort}
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
        sort={sort}
        onSortChange={setSort}
        onNavigate={() => setFilterOpen(false)}
      />
    </div>
  );
}
