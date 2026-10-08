import Link from "next/link";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { PackagePlus, Warehouse } from "lucide-react";
import { getDb, withDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import {
  ADMIN_PAGE_SIZE,
  AdminPagination,
  parsePage,
} from "@/components/admin/admin-pagination";
import { StatsCard } from "@/components/admin/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { formatCurrency } from "@/lib/utils";

const STATUS_FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "active", label: "Aktif" },
  { id: "draft", label: "Taslak" },
  { id: "inactive", label: "Pasif" },
  { id: "archived", label: "Arşiv" },
] as const;

const STOCK_FILTERS = [
  { id: "all", label: "Stok: Tümü" },
  { id: "ok", label: "Yeterli" },
  { id: "low", label: "Düşük" },
  { id: "out", label: "Tükenen" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  draft: "Taslak",
  inactive: "Pasif",
  archived: "Arşiv",
};

function statusTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "draft") return "neutral" as const;
  if (status === "inactive") return "warning" as const;
  return "danger" as const;
}

function stockLevel(stock: number, minStock: number) {
  if (stock <= 0) return { label: "Tükendi", tone: "danger" as const, pct: 0 };
  if (stock <= minStock) {
    const pct = Math.max(8, Math.round((stock / Math.max(minStock * 2, 1)) * 100));
    return { label: "Düşük", tone: "warning" as const, pct: Math.min(pct, 45) };
  }
  const pct = Math.min(100, Math.round((stock / Math.max(minStock * 4, stock)) * 100));
  return { label: "Yeterli", tone: "success" as const, pct: Math.max(55, pct) };
}

function meterColor(tone: "success" | "warning" | "danger") {
  if (tone === "danger") return "bg-[var(--bv-danger)]";
  if (tone === "warning") return "bg-[var(--bv-warning)]";
  return "bg-[var(--bv-success)]";
}

function buildHref(opts: {
  q?: string;
  durum?: string;
  stok?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.durum && opts.durum !== "all") params.set("durum", opts.durum);
  if (opts.stok && opts.stok !== "all") params.set("stok", opts.stok);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

async function loadProductsPage(
  q: string,
  durum: string,
  stok: string,
  page: number,
) {
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
  if (durum !== "all") {
    conditions.push(
      eq(products.status, durum as "draft" | "active" | "inactive" | "archived"),
    );
  }
  if (stok === "out") conditions.push(eq(products.stock, 0));
  if (stok === "low") {
    conditions.push(
      sql`${products.stock} > 0 and ${products.stock} <= ${products.minStock}`,
    );
  }
  if (stok === "ok") {
    conditions.push(sql`${products.stock} > ${products.minStock}`);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [summary, filtered, rows] = await Promise.all([
    database
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${products.status} = 'active')::int`,
        draft: sql<number>`count(*) filter (where ${products.status} = 'draft')::int`,
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
        price: products.price,
        stock: products.stock,
        minStock: products.minStock,
        status: products.status,
      })
      .from(products)
      .where(where)
      .orderBy(desc(products.updatedAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
  ]);

  const filteredTotal = filtered[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / ADMIN_PAGE_SIZE));

  return {
    stats: summary[0] ?? { total: 0, active: 0, draft: 0, low: 0, out: 0 },
    rows,
    filteredTotal,
    totalPages,
  };
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string; stok?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const durum = STATUS_FILTERS.some((item) => item.id === params.durum)
    ? params.durum!
    : "all";
  const stok = STOCK_FILTERS.some((item) => item.id === params.stok)
    ? params.stok!
    : "all";

  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const first = await withDb(() =>
    loadProductsPage(q, durum, stok, requestedPage),
  );
  const page = parsePage(params.page, first.totalPages);
  const { stats, rows, filteredTotal, totalPages } =
    page === requestedPage
      ? first
      : await withDb(() => loadProductsPage(q, durum, stok, page));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Ürünler
          </h1>
          <p className="mt-0.5 text-sm text-[var(--bv-muted)]">
            Katalog yönetimi · {stats.total} kayıt
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href="/admin/stock" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-1.5 sm:w-auto">
              <Warehouse className="h-4 w-4" strokeWidth={1.75} />
              Stok
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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatsCard
          label="Toplam"
          value={stats.total}
          href="/admin/products"
        />
        <StatsCard
          label="Aktif"
          value={stats.active}
          tone="success"
          href="/admin/products?durum=active"
        />
        <StatsCard
          label="Taslak"
          value={stats.draft}
          href="/admin/products?durum=draft"
        />
        <StatsCard
          label="Düşük stok"
          value={stats.low}
          tone={stats.low > 0 ? "warning" : "default"}
          href="/admin/products?stok=low"
        />
        <StatsCard
          label="Tükenen"
          value={stats.out}
          tone={stats.out > 0 ? "danger" : "default"}
          className="col-span-2 xl:col-span-1"
          href="/admin/products?stok=out"
        />
      </div>

      <section className="space-y-3 border border-[var(--bv-border)] bg-white p-3 sm:p-4">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            label="Ara"
            name="q"
            defaultValue={q}
            placeholder="Ürün adı, SKU veya barkod"
            className="sm:min-w-[16rem]"
          />
          {durum !== "all" ? (
            <input type="hidden" name="durum" value={durum} />
          ) : null}
          {stok !== "all" ? (
            <input type="hidden" name="stok" value={stok} />
          ) : null}
          <Button type="submit" className="w-full sm:w-auto">
            Ara
          </Button>
          {q || durum !== "all" || stok !== "all" ? (
            <Link href="/admin/products" className="w-full sm:w-auto">
              <Button type="button" variant="ghost" className="w-full sm:w-auto">
                Temizle
              </Button>
            </Link>
          ) : null}
        </form>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-webkit-overflow-scrolling:touch]">
            {STATUS_FILTERS.map((filter) => {
              const active = durum === filter.id;
              return (
                <Link
                  key={filter.id}
                  href={buildHref({ q, durum: filter.id, stok })}
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
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-webkit-overflow-scrolling:touch]">
            {STOCK_FILTERS.map((filter) => {
              const active = stok === filter.id;
              return (
                <Link
                  key={filter.id}
                  href={buildHref({ q, durum, stok: filter.id })}
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
        </div>
      </section>

      <div className="space-y-0">
        <AdminTable
          rows={rows}
          emptyMessage="Bu filtrede ürün yok. Yeni ürün ekleyerek başlayın."
          columns={[
            {
              key: "name",
              header: "Ürün",
              sortable: true,
              className: "min-w-[9rem] max-w-[16rem]",
              cell: (r) => (
                <div className="min-w-0">
                  <Link
                    href={`/admin/products/${r.id}`}
                    className="line-clamp-2 font-medium break-words hover:underline"
                    title={r.name}
                  >
                    {r.name}
                  </Link>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--bv-muted)]">
                    {r.sku}
                  </p>
                </div>
              ),
            },
            {
              key: "price",
              header: "Fiyat",
              sortable: true,
              className: "whitespace-nowrap",
              cell: (r) => (
                <span className="tabular-nums font-medium">
                  {formatCurrency(r.price)}
                </span>
              ),
            },
            {
              key: "stock",
              header: "Stok",
              className: "min-w-[7.5rem]",
              cell: (r) => {
                const level = stockLevel(r.stock, r.minStock);
                return (
                  <Link
                    href={`/admin/stock?q=${encodeURIComponent(r.sku)}`}
                    className="group block min-w-[5.5rem]"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-lg font-semibold tabular-nums leading-none group-hover:underline">
                        {r.stock}
                      </span>
                      <Badge tone={level.tone} className="origin-right scale-90">
                        {level.label}
                      </Badge>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden bg-[var(--bv-concrete)]">
                      <div
                        className={`h-full ${meterColor(level.tone)}`}
                        style={{ width: `${level.pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--bv-muted)]">
                      Alt limit {r.minStock}
                    </p>
                  </Link>
                );
              },
            },
            {
              key: "status",
              header: "Durum",
              hideOnMobile: true,
              cell: (r) => (
                <Badge tone={statusTone(r.status)}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "İşlem",
              className: "w-[1%] whitespace-nowrap text-right",
              cell: (r) => <ProductRowActions id={r.id} name={r.name} />,
            },
          ]}
        />
        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalItems={filteredTotal}
          hrefForPage={(p) => buildHref({ q, durum, stok, page: p })}
          className="mt-0 border border-t-0 border-[var(--bv-border)]"
        />
      </div>
    </div>
  );
}
