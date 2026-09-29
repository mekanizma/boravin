import { getTranslations } from "next-intl/server";
import { CatalogClient } from "@/components/storefront/catalog-client";
import { loadProductCards } from "@/lib/storefront/products";
import { findCategory } from "@/lib/storefront/catalog";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { translateCategoryName } from "@/lib/storefront/use-category-label";
import { parseCatalogSort } from "@/lib/storefront/catalog-sort";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const t = await getTranslations("Catalog");
  const tc = await getTranslations("CatalogCategories");
  const { slug } = await params;
  const sp = await searchParams;
  const sort = parseCatalogSort(sp.sort);
  const last = slug[slug.length - 1] ?? "";
  const known = findCategory(last);
  let title = known
    ? translateCategoryName((key) => tc(key as never), known)
    : last;
  if (!known) {
    try {
      const cat = await db.query.categories.findFirst({
        where: eq(categories.slug, last),
      });
      if (cat) {
        title = translateCategoryName((key) => tc(key as never), {
          slug: cat.slug,
          name: cat.name,
        });
      }
    } catch {
      // ignore
    }
  }
  const products = await loadProductCards({
    categorySlug: last,
    sort,
    limit: 48,
  });
  return (
    <CatalogClient
      products={products}
      title={title}
      subtitle={t("categorySubtitle")}
    />
  );
}
