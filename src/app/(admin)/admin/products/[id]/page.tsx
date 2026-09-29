import { eq } from "drizzle-orm";
import { getDb, isTransientDbError, recoverDb } from "@/lib/db";
import {
  brands,
  categories,
  productVariants,
  products,
} from "@/lib/db/schema";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function loadAdminProduct(id: string) {
  const run = async () => {
    const database = getDb();
    const product = await database.query.products.findFirst({
      where: eq(products.id, id),
    });
    if (!product) return null;
    const [brand, category, variants] = await Promise.all([
      product.brandId
        ? database.query.brands.findFirst({ where: eq(brands.id, product.brandId) })
        : Promise.resolve(null),
      product.categoryId
        ? database.query.categories.findFirst({
            where: eq(categories.id, product.categoryId),
          })
        : Promise.resolve(null),
      database
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id)),
    ]);
    return {
      ...product,
      brand: brand ?? null,
      category: category ?? null,
      variants,
    };
  };

  try {
    return await run();
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    await recoverDb();
    return await run();
  }
}

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await loadAdminProduct(id);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{product.name}</h1>
          <p className="text-sm text-[var(--bv-muted)]">
            SKU: {product.sku}
            {product.barcode ? ` · Barkod: ${product.barcode}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/stock?q=${encodeURIComponent(product.sku)}`}>
            <Button variant="accent">Stok hareketi</Button>
          </Link>
          <Link href="/admin/products">
            <Button variant="outline">Listeye dön</Button>
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
          <p className="text-xs text-[var(--bv-muted)]">Fiyat</p>
          <p className="mt-1 font-semibold">
            {formatCurrency(Number(product.price))}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
          <p className="text-xs text-[var(--bv-muted)]">Stok</p>
          <p className="mt-1 font-semibold">{product.stock}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
          <p className="text-xs text-[var(--bv-muted)]">Durum</p>
          <div className="mt-1">
            <Badge tone={product.status === "active" ? "success" : "neutral"}>
              {product.status}
            </Badge>
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
          <p className="text-xs text-[var(--bv-muted)]">Varyant</p>
          <p className="mt-1 font-semibold">{product.variants?.length ?? 0}</p>
        </div>
      </div>
      {product.description ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
          <h2 className="font-semibold">Açıklama</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--bv-slate)]">
            {product.description}
          </p>
        </div>
      ) : null}
    </div>
  );
}
