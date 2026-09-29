import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb, isTransientDbError, recoverDb } from "@/lib/db";
import { brands, categories, products } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { EditProductForm } from "@/components/admin/edit-product-form";

async function queryOptions() {
  const database = getDb();
  const [categoryRows, brandRows] = await Promise.all([
    database
      .select({
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    database
      .select({ id: brands.id, name: brands.name })
      .from(brands)
      .where(eq(brands.isActive, true))
      .orderBy(asc(brands.name)),
  ]);
  const byId = new Map(categoryRows.map((row) => [row.id, row]));
  return {
    categories: categoryRows.map((row) => {
      const parent = row.parentId ? byId.get(row.parentId) : undefined;
      return {
        id: row.id,
        label: parent ? `${parent.name} / ${row.name}` : row.name,
      };
    }),
    brands: brandRows,
  };
}

async function loadAdminProduct(id: string) {
  const run = async () => {
    const database = getDb();
    const product = await database.query.products.findFirst({
      where: eq(products.id, id),
    });
    if (!product) return null;
    const options = await queryOptions();
    return { product, ...options };
  };

  try {
    return await run();
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    await recoverDb();
    return await run();
  }
}

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadAdminProduct(id);
  if (!data) notFound();
  const { product, categories, brands } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-28 sm:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--bv-muted)] uppercase">
            Ürün düzenle
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--bv-muted)]">
            SKU: {product.sku}
            {product.barcode ? ` · Barkod: ${product.barcode}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/stock?q=${encodeURIComponent(product.sku)}`}>
            <Button variant="outline">Stok hareketi</Button>
          </Link>
          {product.slug ? (
            <Link href={`/urun/${product.slug}`} target="_blank">
              <Button variant="outline">Mağazada gör</Button>
            </Link>
          ) : null}
        </div>
      </div>

      <EditProductForm
        product={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          slug: product.slug,
          categoryId: product.categoryId,
          brandId: product.brandId,
          shortDescription: product.shortDescription,
          description: product.description,
          price: String(product.price),
          compareAtPrice: product.compareAtPrice
            ? String(product.compareAtPrice)
            : null,
          stock: product.stock,
          status: product.status,
          isFeatured: product.isFeatured,
          isNew: product.isNew,
          isCampaign: product.isCampaign,
        }}
        categories={categories}
        brands={brands}
      />
    </div>
  );
}
