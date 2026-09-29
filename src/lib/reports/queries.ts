import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  invoicePayments,
  invoices,
  orderItems,
  orders,
  products,
  reviews,
  stockMovements,
} from "@/lib/db/schema";
import { ensureInvoiceTables } from "@/lib/invoices/ensure";
import { ensureOrderStatusEnum } from "@/lib/orders/ensure";
import { ORDER_STATUS_LABELS, orderStatusLabel } from "@/lib/orders/status";
import {
  type ReportPeriod,
  percentChange,
  resolveReportRange,
} from "@/lib/reports/ranges";

function money(n: number | string | null | undefined) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export async function loadEcommerceReport(period: ReportPeriod) {
  const range = resolveReportRange(period);

  try {
    await Promise.all([ensureOrderStatusEnum(), ensureInvoiceTables()]);

    const paidInRange = and(
      eq(orders.paymentStatus, "paid"),
      gte(orders.createdAt, range.start),
      lt(orders.createdAt, range.end),
    );
    const paidPrev = and(
      eq(orders.paymentStatus, "paid"),
      gte(orders.createdAt, range.prevStart),
      lt(orders.createdAt, range.prevEnd),
    );

    const [
      currentSales,
      prevSales,
      orderStatusRows,
      paymentMethodRows,
      dailyTrend,
      topProducts,
      topCustomers,
      newCustomers,
      prevNewCustomers,
      customerSegments,
      stockStats,
      stockMoves,
      invoiceSummary,
      paymentMethodInvoice,
      reviewStats,
      cancelStats,
    ] = await Promise.all([
      db
        .select({
          revenue: sql<string>`coalesce(sum(${orders.grandTotal}::numeric),0)`,
          orders: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(paidInRange),
      db
        .select({
          revenue: sql<string>`coalesce(sum(${orders.grandTotal}::numeric),0)`,
          orders: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(paidPrev),
      db
        .select({
          status: orders.status,
          count: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, range.start),
            lt(orders.createdAt, range.end),
          ),
        )
        .groupBy(orders.status),
      db
        .select({
          method: sql<string>`coalesce(nullif(${orders.paymentMethod}, ''), 'Belirtilmedi')`,
          count: sql<number>`count(*)::int`,
          revenue: sql<string>`coalesce(sum(${orders.grandTotal}::numeric),0)`,
        })
        .from(orders)
        .where(paidInRange)
        .groupBy(sql`coalesce(nullif(${orders.paymentMethod}, ''), 'Belirtilmedi')`)
        .orderBy(sql`sum(${orders.grandTotal}::numeric) desc`)
        .limit(8),
      db
        .select({
          day: sql<string>`to_char(${orders.createdAt}, 'DD.MM')`,
          total: sql<number>`coalesce(sum(${orders.grandTotal}::numeric),0)::float`,
          orders: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(paidInRange)
        .groupBy(sql`to_char(${orders.createdAt}, 'DD.MM')`)
        .orderBy(sql`min(${orders.createdAt})`),
      db
        .select({
          productId: orderItems.productId,
          name: orderItems.productName,
          sku: orderItems.sku,
          quantity: sql<number>`coalesce(sum(${orderItems.quantity}),0)::int`,
          revenue: sql<string>`coalesce(sum(${orderItems.total}::numeric),0)`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(paidInRange)
        .groupBy(orderItems.productId, orderItems.productName, orderItems.sku)
        .orderBy(sql`sum(${orderItems.total}::numeric) desc`)
        .limit(10),
      db
        .select({
          id: customers.id,
          name: sql<string>`coalesce(nullif(trim(concat_ws(' ', ${customers.firstName}, ${customers.lastName})), ''), ${customers.companyTitle}, ${customers.companyName}, ${customers.email})`,
          email: customers.email,
          orderCount: customers.orderCount,
          totalSpent: customers.totalSpent,
          accountType: customers.accountType,
        })
        .from(customers)
        .orderBy(desc(customers.totalSpent))
        .limit(10),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(
          and(
            gte(customers.createdAt, range.start),
            lt(customers.createdAt, range.end),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(
          and(
            gte(customers.createdAt, range.prevStart),
            lt(customers.createdAt, range.prevEnd),
          ),
        ),
      db
        .select({
          segment: sql<string>`coalesce(${customers.segment}, 'new')`,
          count: sql<number>`count(*)::int`,
        })
        .from(customers)
        .groupBy(sql`coalesce(${customers.segment}, 'new')`),
      db
        .select({
          total: sql<number>`count(*)::int`,
          lowStock: sql<number>`count(*) filter (where ${products.stock} > 0 and ${products.stock} <= ${products.minStock})::int`,
          outOfStock: sql<number>`count(*) filter (where ${products.stock} = 0)::int`,
          units: sql<number>`coalesce(sum(${products.stock}),0)::int`,
        })
        .from(products),
      db
        .select({
          type: stockMovements.type,
          quantity: sql<number>`coalesce(sum(abs(${stockMovements.quantity})),0)::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(stockMovements)
        .where(
          and(
            gte(stockMovements.createdAt, range.start),
            lt(stockMovements.createdAt, range.end),
          ),
        )
        .groupBy(stockMovements.type),
      db
        .select({
          unpaidCount: sql<number>`count(*) filter (where ${invoices.paymentStatus} = 'unpaid' and ${invoices.status} <> 'cancelled')::int`,
          partialCount: sql<number>`count(*) filter (where ${invoices.paymentStatus} = 'partial' and ${invoices.status} <> 'cancelled')::int`,
          paidCount: sql<number>`count(*) filter (where ${invoices.paymentStatus} = 'paid' and ${invoices.status} <> 'cancelled')::int`,
          openAmount: sql<number>`coalesce(sum(case when ${invoices.status} <> 'cancelled' and ${invoices.paymentStatus} in ('unpaid','partial') then (${invoices.grandTotal}::numeric - coalesce(${invoices.paidAmount},0)::numeric) else 0 end), 0)::float`,
          collectedInRange: sql<number>`0::float`,
        })
        .from(invoices),
      db
        .select({
          method: sql<string>`coalesce(nullif(${invoicePayments.method}, ''), 'Belirtilmedi')`,
          amount: sql<string>`coalesce(sum(${invoicePayments.amount}::numeric),0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(invoicePayments)
        .where(
          and(
            gte(invoicePayments.paidAt, range.start),
            lt(invoicePayments.paidAt, range.end),
          ),
        )
        .groupBy(sql`coalesce(nullif(${invoicePayments.method}, ''), 'Belirtilmedi')`)
        .orderBy(sql`sum(${invoicePayments.amount}::numeric) desc`),
      db
        .select({
          pending: sql<number>`count(*) filter (where ${reviews.status} = 'pending')::int`,
          approved: sql<number>`count(*) filter (where ${reviews.status} = 'approved')::int`,
          rejected: sql<number>`count(*) filter (where ${reviews.status} = 'rejected')::int`,
          avgRating: sql<number>`coalesce(avg(${reviews.rating}) filter (where ${reviews.status} = 'approved'), 0)::float`,
        })
        .from(reviews),
      db
        .select({
          total: sql<number>`count(*)::int`,
          cancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')::int`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, range.start),
            lt(orders.createdAt, range.end),
          ),
        ),
    ]);

    const revenue = money(currentSales[0]?.revenue);
    const orderCount = currentSales[0]?.orders ?? 0;
    const prevRevenue = money(prevSales[0]?.revenue);
    const prevOrderCount = prevSales[0]?.orders ?? 0;
    const aov = orderCount > 0 ? money(revenue / orderCount) : 0;
    const prevAov =
      prevOrderCount > 0 ? money(prevRevenue / prevOrderCount) : 0;
    const newCustomerCount = newCustomers[0]?.count ?? 0;
    const prevNewCustomerCount = prevNewCustomers[0]?.count ?? 0;
    const totalOrdersInRange = cancelStats[0]?.total ?? 0;
    const cancelledOrders = cancelStats[0]?.cancelled ?? 0;
    const cancelRate =
      totalOrdersInRange > 0
        ? Math.round((cancelledOrders / totalOrdersInRange) * 1000) / 10
        : 0;

    const collectedRows = await db
      .select({
        amount: sql<string>`coalesce(sum(${invoicePayments.amount}::numeric),0)`,
      })
      .from(invoicePayments)
      .where(
        and(
          gte(invoicePayments.paidAt, range.start),
          lt(invoicePayments.paidAt, range.end),
        ),
      );

    const statusOrder = Object.keys(ORDER_STATUS_LABELS);
    const ordersByStatus = statusOrder
      .map((status) => {
        const row = orderStatusRows.find((r) => r.status === status);
        return {
          key: status,
          label: orderStatusLabel(status),
          count: row?.count ?? 0,
        };
      })
      .filter((row) => row.count > 0);

    const stockTypeLabel: Record<string, string> = {
      in: "Giriş",
      out: "Çıkış",
      adjust: "Sayım",
      sale: "Satış",
      return: "İade",
    };

    return {
      period,
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      kpis: {
        revenue,
        revenueChange: percentChange(revenue, prevRevenue),
        orders: orderCount,
        ordersChange: percentChange(orderCount, prevOrderCount),
        aov,
        aovChange: percentChange(aov, prevAov),
        newCustomers: newCustomerCount,
        newCustomersChange: percentChange(
          newCustomerCount,
          prevNewCustomerCount,
        ),
        cancelRate,
        cancelledOrders,
      },
      trend: dailyTrend.map((row) => ({
        day: row.day,
        total: Number(row.total) || 0,
        orders: row.orders,
      })),
      ordersByStatus,
      paymentMethods: paymentMethodRows.map((row) => ({
        method: row.method,
        count: row.count,
        revenue: money(row.revenue),
      })),
      topProducts: topProducts.map((row) => ({
        productId: row.productId,
        name: row.name,
        sku: row.sku,
        quantity: row.quantity,
        revenue: money(row.revenue),
      })),
      topCustomers: topCustomers.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        orderCount: row.orderCount,
        totalSpent: money(row.totalSpent),
        accountType: row.accountType,
      })),
      customerSegments: customerSegments.map((row) => ({
        segment: row.segment,
        count: row.count,
      })),
      stock: {
        total: stockStats[0]?.total ?? 0,
        lowStock: stockStats[0]?.lowStock ?? 0,
        outOfStock: stockStats[0]?.outOfStock ?? 0,
        units: stockStats[0]?.units ?? 0,
        movements: stockMoves.map((row) => ({
          type: row.type,
          label: stockTypeLabel[row.type] ?? row.type,
          quantity: row.quantity,
          count: row.count,
        })),
      },
      invoices: {
        unpaidCount: invoiceSummary[0]?.unpaidCount ?? 0,
        partialCount: invoiceSummary[0]?.partialCount ?? 0,
        paidCount: invoiceSummary[0]?.paidCount ?? 0,
        openAmount: money(invoiceSummary[0]?.openAmount),
        collectedInRange: money(collectedRows[0]?.amount),
        methods: paymentMethodInvoice.map((row) => ({
          method: row.method,
          amount: money(row.amount),
          count: row.count,
        })),
      },
      reviews: {
        pending: reviewStats[0]?.pending ?? 0,
        approved: reviewStats[0]?.approved ?? 0,
        rejected: reviewStats[0]?.rejected ?? 0,
        avgRating: Math.round((reviewStats[0]?.avgRating ?? 0) * 10) / 10,
      },
    };
  } catch (error) {
    console.error("[reports] load failed", error);
    return emptyReport(period);
  }
}

function emptyReport(period: ReportPeriod) {
  return {
    period,
    range: { start: new Date().toISOString(), end: new Date().toISOString() },
    kpis: {
      revenue: 0,
      revenueChange: 0,
      orders: 0,
      ordersChange: 0,
      aov: 0,
      aovChange: 0,
      newCustomers: 0,
      newCustomersChange: 0,
      cancelRate: 0,
      cancelledOrders: 0,
    },
    trend: [] as { day: string; total: number; orders: number }[],
    ordersByStatus: [] as { key: string; label: string; count: number }[],
    paymentMethods: [] as {
      method: string;
      count: number;
      revenue: number;
    }[],
    topProducts: [] as {
      productId: string | null;
      name: string;
      sku: string | null;
      quantity: number;
      revenue: number;
    }[],
    topCustomers: [] as {
      id: string;
      name: string;
      email: string;
      orderCount: number;
      totalSpent: number;
      accountType: string;
    }[],
    customerSegments: [] as { segment: string; count: number }[],
    stock: {
      total: 0,
      lowStock: 0,
      outOfStock: 0,
      units: 0,
      movements: [] as {
        type: string;
        label: string;
        quantity: number;
        count: number;
      }[],
    },
    invoices: {
      unpaidCount: 0,
      partialCount: 0,
      paidCount: 0,
      openAmount: 0,
      collectedInRange: 0,
      methods: [] as { method: string; amount: number; count: number }[],
    },
    reviews: {
      pending: 0,
      approved: 0,
      rejected: 0,
      avgRating: 0,
    },
  };
}

export type EcommerceReport = Awaited<ReturnType<typeof loadEcommerceReport>>;
