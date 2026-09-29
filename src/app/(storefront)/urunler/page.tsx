import { getTranslations } from "next-intl/server";
import { CatalogClient } from "@/components/storefront/catalog-client";
import { loadProductCards } from "@/lib/storefront/products";
import { parseCatalogSort } from "@/lib/storefront/catalog-sort";
import {
  mergeCatalogProducts,
  mockProductsForCatalog,
} from "@/lib/mock/storefront";

export async function generateMetadata() {
  const t = await getTranslations("Catalog");
  return { title: t("metadataTitle") };
}

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    min?: string;
    max?: string;
    sort?: string;
  }>;
}) {
  const t = await getTranslations("Catalog");
  const sp = await searchParams;
  const sort = parseCatalogSort(sp.sort);
  const products = mergeCatalogProducts(
    await loadProductCards({
      search: sp.q,
      categorySlug: sp.category,
      brandSlug: sp.brand,
      minPrice: sp.min ? Number(sp.min) : undefined,
      maxPrice: sp.max ? Number(sp.max) : undefined,
      sort,
      limit: 48,
    }),
    mockProductsForCatalog({
      search: sp.q,
      brandSlug: sp.brand,
      categorySlug: sp.category,
    }).filter((product) => {
      const price = Number(product.price);
      if (sp.min && price < Number(sp.min)) return false;
      if (sp.max && price > Number(sp.max)) return false;
      return true;
    }),
  );

  return (
    <CatalogClient
      products={products}
      title={sp.q ? t("searchTitle", { q: sp.q }) : t("title")}
      subtitle={
        sp.q
          ? t("searchSubtitle", { q: sp.q })
          : t("subtitle")
      }
    />
  );
}
