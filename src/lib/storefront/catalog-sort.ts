import { asc, desc } from "drizzle-orm";
import { products } from "@/lib/db/schema";
import type { ProductCardData } from "@/components/storefront/product-card";

export type CatalogSort = "recommended" | "price_asc" | "price_desc";

export function parseCatalogSort(raw: string | null | undefined): CatalogSort {
  if (raw === "price_asc" || raw === "price_desc") return raw;
  return "recommended";
}

export function catalogSortOrderBy(sort: CatalogSort) {
  if (sort === "price_asc") {
    return [asc(products.price), desc(products.createdAt)];
  }
  if (sort === "price_desc") {
    return [desc(products.price), desc(products.createdAt)];
  }
  return [
    desc(products.isFeatured),
    desc(products.isCampaign),
    desc(products.soldCount),
    desc(products.createdAt),
  ];
}

export function sortProductCards(
  items: ProductCardData[],
  sort: CatalogSort,
): ProductCardData[] {
  const list = [...items];
  if (sort === "price_asc") {
    return list.sort((a, b) => Number(a.price) - Number(b.price));
  }
  if (sort === "price_desc") {
    return list.sort((a, b) => Number(b.price) - Number(a.price));
  }
  return list.sort((a, b) => {
    const score = (p: ProductCardData) =>
      (p.isFeatured ? 4 : 0) +
      (p.isCampaign ? 2 : 0) +
      (p.isNew ? 1 : 0);
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return Number(b.price) - Number(a.price);
  });
}
