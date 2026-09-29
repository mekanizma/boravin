import { CatalogClient } from "@/components/storefront/catalog-client";
import { loadProductCards } from "@/lib/storefront/products";
import { findCategory } from "@/lib/storefront/catalog";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const last = slug[slug.length - 1] ?? "";
  const known = findCategory(last);
  let title = known?.name ?? last;
  if (!known) {
    try {
      const cat = await db.query.categories.findFirst({
        where: eq(categories.slug, last),
      });
      if (cat) title = cat.name;
    } catch {
      // ignore
    }
  }
  const products = await loadProductCards({ categorySlug: last, limit: 48 });
  return (
    <CatalogClient
      products={products}
      title={title}
      subtitle="Kategori ürünleri"
    />
  );
}
