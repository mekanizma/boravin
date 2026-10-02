import Link from "next/link";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb, withDb } from "@/lib/db";
import {
  productVariants,
  products,
  stockMovements,
} from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/admin/stats-card";
import { StockProductList } from "@/components/admin/stock-product-list";

const FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "low", label: "Düşük" },
  { id: "out", label: "Tükenen" },
  { id: "ok", label: "Yeterli" },
] as const;

const TYPE_LABEL: Record<string, string> = {
  in: "Giriş",
  out: "Çıkış",
  adjust: "Sayım",
  sale: "Satış",
  return: "İade",
};

function toneFor(type: string) {
  if (type === "in" || type === "return") return "success" as const;
  if (type === "out" || type === "sale") return "danger" as const;
  return "warning" as const;
}

async function loadStockPage(q: string, durum: string) {
  const database = getDb();

  const conditions = [];
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      or(
        ilike(products.name, like),
        ilike(products.sku, like),
        ilike(products.barcode, like),
      ),
    );
  }
  if (durum === "out") conditions.push(eq(products.stock, 0));
  if (durum === "low") {
    conditions.push(
      sql`${products.stock} > 0 and ${products.stock} <= ${products.minStock}`,
    );
  }
  if (durum === "ok") {
    conditions.push(sql`${products.stock} > ${products.minStock}`);
  }

  const movementConditions = [];
  if (q) {
    const like = `%${q}%`;
    movementConditions.push(
      or(ilike(products.name, like), ilike(products.sku, like)),
    );
  }

  const [summary, rows, movements] = await Promise.all([
    database
      .select({
        total: sql<number>`count(*)::int`,
        units: sql<number>`coalesce(sum(${products.stock}), 0)::int`,
        low: sql<number>`count(*) filter (where ${products.stock} > 0 and ${products.stock} <= ${products.minStock})::int`,
        out: sql<number>`count(*) filter (where ${products.stock} = 0)::int`,
      })
      .from(products),
    database
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        stock: products.stock,
        minStock: products.minStock,
      })
      .from(products)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(products.stock, products.name)
      .limit(80),
    database
      .select({
        id: stockMovements.id,
        productName: products.name,
        sku: products.sku,
        variantName: productVariants.name,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        stockBefore: stockMovements.stockBefore,
        stockAfter: stockMovements.stockAfter,
        note: stockMovements.note,
        reference: stockMovements.reference,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(
        productVariants,
        eq(stockMovements.variantId, productVariants.id),
      )
      .where(movementConditions.length ? and(...movementConditions) : undefined)
      .orderBy(desc(stockMovements.createdAt))
      .limit(40),
  ]);

  const variants = rows.length
    ? await database
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          name: productVariants.name,
          sku: productVariants.sku,
          stock: productVariants.stock,
        })
        .from(productVariants)
        .where(
          inArray(
            productVariants.productId,
            rows.map((row) => row.id),
          ),
        )
    : [];

  return {
    stats: summary[0] ?? { total: 0, units: 0, low: 0, out: 0 },
    productsForList: rows.map((row) => ({
      ...row,
      variants: variants
        .filter((variant) => variant.productId === row.id)
        .map(({ productId: _productId, ...variant }) => variant),
    })),
    movements,
  };
}

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const durum = FILTERS.some((item) => item.id === params.durum)
    ? params.durum!
    : "all";

  const { stats, productsForList, movements } = await withDb(() =>
    loadStockPage(q, durum),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Stok</h1>
        <p className="text-sm text-[var(--bv-muted)]">
          Giriş, çıkış, sayım ve satış hareketleri buradan izlenir.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatsCard label="Ürün" value={stats.total} href="/admin/stock" />
        <StatsCard label="Toplam adet" value={stats.units} />
        <StatsCard
          label="Düşük stok"
          value={stats.low}
          href="/admin/stock?durum=low"
        />
        <StatsCard
          label="Tükenen"
          value={stats.out}
          href="/admin/stock?durum=out"
        />
      </div>

      <form className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          label="Ara"
          name="q"
          defaultValue={q}
          placeholder="Ürün, SKU veya barkod"
        />
        {durum !== "all" ? <input type="hidden" name="durum" value={durum} /> : null}
        <Button type="submit" className="w-full sm:w-auto">
          Ara
        </Button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter) => {
          const active = durum === filter.id;
          const href =
            filter.id === "all"
              ? q
                ? `/admin/stock?q=${encodeURIComponent(q)}`
                : "/admin/stock"
              : `/admin/stock?durum=${filter.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
          return (
            <Link
              key={filter.id}
              href={href}
              className={`shrink-0 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-[var(--bv-ink)] text-white"
                  : "bg-white text-[var(--bv-slate)] ring-1 ring-[var(--bv-border)]"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <StockProductList products={productsForList} />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Stok hareketleri</h2>
        {movements.length ? (
          <ul className="divide-y divide-[var(--bv-border)] border border-[var(--bv-border)] bg-white">
            {movements.map((movement) => {
              const when = new Date(movement.createdAt).toLocaleString("tr-TR", {
                dateStyle: "short",
                timeStyle: "short",
              });
              const sign = movement.quantity > 0 ? "+" : "";
              return (
                <li
                  key={movement.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={toneFor(movement.type)}>
                        {TYPE_LABEL[movement.type] ?? movement.type}
                      </Badge>
                      <p className="truncate text-sm font-medium">
                        {movement.productName}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-[var(--bv-muted)]">
                      {when}
                      {movement.variantName ? ` · ${movement.variantName}` : ""}
                      {movement.reference ? ` · ${movement.reference}` : ""}
                      {movement.note ? ` · ${movement.note}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {sign}
                    {movement.quantity}{" "}
                    <span className="font-normal text-[var(--bv-muted)]">
                      {movement.stockBefore} → {movement.stockAfter}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--bv-border-strong)] p-8 text-center text-sm text-[var(--bv-muted)]">
            Henüz stok hareketi yok. Giriş, çıkış veya sayım kaydı oluşturun.
          </div>
        )}
      </section>
    </div>
  );
}
