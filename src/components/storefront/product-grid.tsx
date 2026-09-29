import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export function ProductGrid({
  products,
  className,
  emptyTitle = "Ürün bulunamadı",
  emptyDescription = "Filtreleri temizleyip tekrar deneyin.",
}: {
  products: ProductCardData[];
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!products.length) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
