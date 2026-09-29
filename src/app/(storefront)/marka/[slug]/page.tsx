import { getTranslations } from "next-intl/server";
import { CatalogClient } from "@/components/storefront/catalog-client";
import { loadProductCards } from "@/lib/storefront/products";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseCatalogSort } from "@/lib/storefront/catalog-sort";

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const t = await getTranslations("Catalog");
  const { slug } = await params;
  const sp = await searchParams;
  const sort = parseCatalogSort(sp.sort);
  let title = slug;
  try {
    const brand = await db.query.brands.findFirst({
      where: eq(brands.slug, slug),
    });
    if (brand) title = brand.name;
  } catch {
    // ignore
  }
  const products = await loadProductCards({ brandSlug: slug, sort, limit: 48 });
  return (
    <CatalogClient products={products} title={title} subtitle={t("brandSubtitle")} />
  );
}
