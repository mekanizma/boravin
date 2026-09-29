import { CatalogClient } from "@/components/storefront/catalog-client";
import { loadProductCards } from "@/lib/storefront/products";
import {
  mergeCatalogProducts,
  mockProductsForCatalog,
} from "@/lib/mock/storefront";

export const metadata = {
  title: "Ürünler",
};

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; brand?: string; min?: string; max?: string }>;
}) {
  const sp = await searchParams;
  const products = mergeCatalogProducts(
    await loadProductCards({
      search: sp.q,
      categorySlug: sp.category,
      brandSlug: sp.brand,
      minPrice: sp.min ? Number(sp.min) : undefined,
      maxPrice: sp.max ? Number(sp.max) : undefined,
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
      title={sp.q ? `Arama: ${sp.q}` : "Ürünler"}
      subtitle={
        sp.q
          ? `"${sp.q}" için sonuçlar`
          : "Kıbrıs için seçilmiş teknoloji ürünleri"
      }
    />
  );
}
