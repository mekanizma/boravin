import { sql, eq, and, gte } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { StatsCard } from "@/components/admin/stats-card";
import { SalesTrendChart } from "@/components/admin/sales-trend-chart";
import { db } from "@/lib/db";
import {
  campaigns,
  customers,
  orders,
  products,
} from "@/lib/db/schema";
import { formatCurrency } from "@/lib/utils";

const getDashboardData = unstable_cache(
  async () => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      sales,
      todaySales,
      monthSales,
      orderCounts,
      productStats,
      customerCount,
      activeCampaigns,
      recentTrend,
    ] = await Promise.all([
      db
        .select({
          total: sql<string>`coalesce(sum(${orders.grandTotal}::numeric),0)`,
        })
        .from(orders)
        .where(eq(orders.paymentStatus, "paid")),
      db
        .select({
          total: sql<string>`coalesce(sum(${orders.grandTotal}::numeric),0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.paymentStatus, "paid"),
            gte(orders.createdAt, startOfDay),
          ),
        ),
      db
        .select({
          total: sql<string>`coalesce(sum(${orders.grandTotal}::numeric),0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.paymentStatus, "paid"),
            gte(orders.createdAt, startOfMonth),
          ),
        ),
      db
        .select({
          status: orders.status,
          count: sql<number>`count(*)::int`,
        })
        .from(orders)
        .groupBy(orders.status),
      db
        .select({
          total: sql<number>`count(*)::int`,
          lowStock: sql<number>`count(*) filter (where ${products.stock} <= ${products.minStock} and ${products.stock} > 0)::int`,
          outOfStock: sql<number>`count(*) filter (where ${products.stock} = 0)::int`,
        })
        .from(products),
      db.select({ count: sql<number>`count(*)::int` }).from(customers),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(campaigns)
        .where(eq(campaigns.status, "published")),
      db
        .select({
          day: sql<string>`to_char(${orders.createdAt}, 'DD.MM')`,
          total: sql<number>`coalesce(sum(${orders.grandTotal}::numeric),0)::float`,
        })
        .from(orders)
        .where(gte(orders.createdAt, new Date(Date.now() - 14 * 86400000)))
        .groupBy(sql`to_char(${orders.createdAt}, 'DD.MM')`)
        .orderBy(sql`min(${orders.createdAt})`),
    ]);

    const byStatus = Object.fromEntries(
      orderCounts.map((r) => [r.status, r.count]),
    );

    return {
      totalSales: Number(sales[0]?.total ?? 0),
      todaySales: Number(todaySales[0]?.total ?? 0),
      todayOrders: todaySales[0]?.count ?? 0,
      monthSales: Number(monthSales[0]?.total ?? 0),
      pending: (byStatus.new ?? 0) + (byStatus.awaiting_payment ?? 0) + (byStatus.accepted ?? 0),
      preparing: (byStatus.preparing ?? 0) + (byStatus.shipped ?? 0),
      delivered: byStatus.delivered ?? 0,
      cancelled: byStatus.cancelled ?? 0,
      products: productStats[0]?.total ?? 0,
      lowStock: productStats[0]?.lowStock ?? 0,
      outOfStock: productStats[0]?.outOfStock ?? 0,
      customers: customerCount[0]?.count ?? 0,
      campaigns: activeCampaigns[0]?.count ?? 0,
      trend: recentTrend,
    };
  } catch {
    return {
      totalSales: 0,
      todaySales: 0,
      todayOrders: 0,
      monthSales: 0,
      pending: 0,
      preparing: 0,
      delivered: 0,
      cancelled: 0,
      products: 0,
      lowStock: 0,
      outOfStock: 0,
      customers: 0,
      campaigns: 0,
      trend: [] as { day: string; total: number }[],
    };
  }
  },
  ["admin-dashboard-v1"],
  { revalidate: 30, tags: ["admin-dashboard", "products", "orders"] },
);

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const chartData =
    data.trend.length > 0
      ? data.trend
      : [
          { day: "01", total: 0 },
          { day: "02", total: 0 },
          { day: "03", total: 0 },
        ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--bv-muted)]">
          Satış, stok ve kampanya özeti · Detay için{" "}
          <a href="/admin/reports" className="font-medium text-[var(--bv-teal)] hover:underline">
            Raporlar
          </a>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Toplam satış" value={formatCurrency(data.totalSales)} />
        <StatsCard
          label="Bugün satış"
          value={formatCurrency(data.todaySales)}
          hint={`${data.todayOrders} sipariş`}
        />
        <StatsCard label="Bu ay satış" value={formatCurrency(data.monthSales)} />
        <StatsCard label="Toplam müşteri" value={data.customers} />
        <StatsCard label="Bekleyen sipariş" value={data.pending} />
        <StatsCard label="Hazırlanan" value={data.preparing} />
        <StatsCard label="Teslim edilen" value={data.delivered} />
        <StatsCard label="İptal" value={data.cancelled} />
        <StatsCard label="Toplam ürün" value={data.products} />
        <StatsCard
          label="Düşük stok"
          value={data.lowStock}
          href="/admin/stock?durum=low"
        />
        <StatsCard
          label="Tükenen"
          value={data.outOfStock}
          href="/admin/stock?durum=out"
        />
        <StatsCard label="Aktif kampanya" value={data.campaigns} />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold">Gelir trendi (14 gün)</h2>
        <SalesTrendChart data={chartData} />
      </div>
    </div>
  );
}
