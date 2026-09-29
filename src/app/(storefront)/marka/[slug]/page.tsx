import { CatalogClient } from "@/components/storefront/catalog-client";
import { loadProductCards } from "@/lib/storefront/products";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let title = slug;
  try {
    const brand = await db.query.brands.findFirst({
      where: eq(brands.slug, slug),
    });
    if (brand) title = brand.name;
  } catch {
    // ignore
  }
  const products = await loadProductCards({ brandSlug: slug, limit: 48 });
  return (
    <CatalogClient products={products} title={title} subtitle="Marka vitrini" />
  );
}
