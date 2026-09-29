import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

async function loadProducts() {
  try {
    return await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        price: products.price,
        stock: products.stock,
        status: products.status,
      })
      .from(products)
      .orderBy(desc(products.updatedAt))
      .limit(50);
  } catch {
    return [] as Array<{
      id: string;
      name: string;
      sku: string;
      price: string;
      stock: number;
      status: string;
    }>;
  }
}

export default async function AdminProductsPage() {
  const rows = await loadProducts();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Ürünler</h1>
          <p className="text-sm text-[var(--bv-muted)]">Katalog yönetimi</p>
        </div>
        <Link href="/admin/products/new">
          <Button variant="accent">Yeni ürün</Button>
        </Link>
      </div>

      <AdminTable
        rows={rows}
        columns={[
          {
            key: "name",
            header: "Ürün",
            sortable: true,
            cell: (r) => (
              <Link
                href={`/admin/products/${r.id}`}
                className="font-medium hover:underline"
              >
                {r.name}
              </Link>
            ),
          },
          { key: "sku", header: "SKU", cell: (r) => r.sku },
          {
            key: "price",
            header: "Fiyat",
            sortable: true,
            cell: (r) => formatCurrency(r.price),
          },
          {
            key: "stock",
            header: "Stok",
            cell: (r) => (
              <Link
                href={`/admin/stock?q=${encodeURIComponent(r.sku)}`}
                className="font-medium hover:underline"
              >
                {r.stock}
              </Link>
            ),
          },
          {
            key: "status",
            header: "Durum",
            cell: (r) => (
              <Badge
                tone={
                  r.status === "active"
                    ? "success"
                    : r.status === "draft"
                      ? "neutral"
                      : "warning"
                }
              >
                {r.status}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
