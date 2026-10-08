import Link from "next/link";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { ArrowDownUp, Package, PackagePlus } from "lucide-react";
import { getDb, withDb } from "@/lib/db";
import {
  productVariants,
  products,
  stockMovements,
} from "@/lib/db/schema";
import {
  ADMIN_PAGE_SIZE,
  AdminPagination,
  parsePage,
} from "@/components/admin/admin-pagination";
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

function buildHref(opts: { q?: string; durum?: string; page?: number }) {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.durum && opts.durum !== "all") params.set("durum", opts.durum);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `/admin/stock?${qs}` : "/admin/stock";
}

async function loadStockPage(q: string, durum: string, page: number) {
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

  const where = conditions.length ? and(...conditions) : undefined;

  const movementConditions = [];
  if (q) {
    const like = `%${q}%`;
    movementConditions.push(
      or(ilike(products.name, like), ilike(products.sku, like)),
    );
  }

  const [summary, filtered, rows, movements] = await Promise.all([
    database
      .select({
        total: sql<number>`count(*)::int`,
        units: sql<number>`coalesce(sum(${products.stock}), 0)::int`,
        low: sql<number>`count(*) filter (where ${products.stock} > 0 and ${products.stock} <= ${products.minStock})::int`,
        out: sql<number>`count(*) filter (where ${products.stock} = 0)::int`,
      })
      .from(products),
    database
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(where),
    database
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        stock: products.stock,
        minStock: products.minStock,
      })
      .from(products)
      .where(where)
      .orderBy(products.stock, products.name)
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
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
      .limit(25),
  ]);

  const filteredTotal = filtered[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / ADMIN_PAGE_SIZE));

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
    filteredTotal,
    totalPages,
  };
}

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const durum = FILTERS.some((item) => item.id === params.durum)
    ? params.durum!
    : "all";

  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const first = await withDb(() => loadStockPage(q, durum, requestedPage));
  const page = parsePage(params.page, first.totalPages);
  const { stats, productsForList, movements, filteredTotal, totalPages } =
    page === requestedPage
      ? first
      : await withDb(() => loadStockPage(q, durum, page));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Stok
          </h1>
          <p className="mt-0.5 text-sm text-[var(--bv-muted)]">
            Giriş, çıkış, sayım ve satış hareketleri
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href="/admin/products" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-1.5 sm:w-auto">
              <Package className="h-4 w-4" strokeWidth={1.75} />
              Ürünler
            </Button>
          </Link>
          <Link href="/admin/urun-cikisi" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-1.5 sm:w-auto">
              <ArrowDownUp className="h-4 w-4" strokeWidth={1.75} />
              Ürün çıkışı
            </Button>
          </Link>
          <Link href="/admin/products/new" className="w-full sm:w-auto">
            <Button variant="accent" className="w-full gap-1.5 sm:w-auto">
              <PackagePlus className="h-4 w-4" strokeWidth={1.75} />
              Yeni ürün
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatsCard label="Ürün" value={stats.total} href="/admin/stock" />
        <StatsCard label="Toplam adet" value={stats.units} />
        <StatsCard
          label="Düşük stok"
          value={stats.low}
          tone={stats.low > 0 ? "warning" : "default"}
          href="/admin/stock?durum=low"
        />
        <StatsCard
          label="Tükenen"
          value={stats.out}
          tone={stats.out > 0 ? "danger" : "default"}
          href="/admin/stock?durum=out"
        />
      </div>

      <section className="space-y-2.5 border border-[var(--bv-border)] bg-white p-3 sm:p-4">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            label="Ara"
            name="q"
            defaultValue={q}
            placeholder="Ürün, SKU veya barkod"
            className="sm:min-w-[16rem]"
          />
          {durum !== "all" ? (
            <input type="hidden" name="durum" value={durum} />
          ) : null}
          <Button type="submit" className="w-full sm:w-auto">
            Ara
          </Button>
          {q || durum !== "all" ? (
            <Link href="/admin/stock" className="w-full sm:w-auto">
              <Button type="button" variant="ghost" className="w-full sm:w-auto">
                Temizle
              </Button>
            </Link>
          ) : null}
        </form>

        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-webkit-overflow-scrolling:touch]">
          {FILTERS.map((filter) => {
            const active = durum === filter.id;
            return (
              <Link
                key={filter.id}
                href={buildHref({ q, durum: filter.id })}
                className={
                  active
                    ? "shrink-0 rounded-[var(--radius-md)] bg-[var(--bv-ink)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white"
                    : "shrink-0 rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-[var(--bv-slate)] hover:bg-[var(--bv-fog)]"
                }
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col border border-[var(--bv-border)] bg-white">
          <div className="shrink-0 border-b border-[var(--bv-border)] px-3 py-2.5 sm:px-4">
            <h2 className="text-sm font-semibold tracking-wide">Stok listesi</h2>
            <p className="mt-0.5 text-xs text-[var(--bv-muted)]">
              {filteredTotal} ürün · sayfa {page}/{totalPages}
            </p>
          </div>
          <div className="max-h-[min(28rem,55vh)] overflow-y-auto overscroll-contain lg:max-h-[min(32rem,60vh)]">
            <StockProductList products={productsForList} />
          </div>
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredTotal}
            hrefForPage={(p) => buildHref({ q, durum, page: p })}
            className="border-t border-[var(--bv-border)]"
          />
        </section>

        <section className="flex min-h-0 flex-col border border-[var(--bv-border)] bg-white">
          <div className="shrink-0 border-b border-[var(--bv-border)] px-3 py-2.5 sm:px-4">
            <h2 className="text-sm font-semibold tracking-wide">
              Stok hareketleri
            </h2>
            <p className="mt-0.5 text-xs text-[var(--bv-muted)]">
              Son {movements.length || 0} kayıt
            </p>
          </div>
          {movements.length ? (
            <ul className="max-h-[min(28rem,55vh)] divide-y divide-[var(--bv-border)] overflow-y-auto overscroll-contain lg:max-h-[min(32rem,60vh)]">
              {movements.map((movement) => {
                const when = new Date(movement.createdAt).toLocaleString(
                  "tr-TR",
                  {
                    dateStyle: "short",
                    timeStyle: "short",
                  },
                );
                const sign = movement.quantity > 0 ? "+" : "";
                const positive = movement.quantity > 0;
                return (
                  <li
                    key={movement.id}
                    className="flex items-start justify-between gap-2 px-3 py-2.5 sm:px-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={toneFor(movement.type)}>
                          {TYPE_LABEL[movement.type] ?? movement.type}
                        </Badge>
                        <p className="truncate text-sm font-medium">
                          {movement.productName}
                        </p>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--bv-muted)]">
                        {when}
                        {movement.variantName
                          ? ` · ${movement.variantName}`
                          : ""}
                        {movement.note ? ` · ${movement.note}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          positive
                            ? "text-[var(--bv-success)]"
                            : "text-[var(--bv-danger)]"
                        }`}
                      >
                        {sign}
                        {movement.quantity}
                      </p>
                      <p className="text-[10px] tabular-nums text-[var(--bv-muted)]">
                        {movement.stockBefore}→{movement.stockAfter}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-sm text-[var(--bv-muted)]">
              Henüz stok hareketi yok.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
