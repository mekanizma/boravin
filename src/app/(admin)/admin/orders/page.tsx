import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
import { formatCurrency } from "@/lib/utils";
import {
  ORDER_FLOW,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/orders/status";
import { ensureOrderStatusEnum } from "@/lib/orders/ensure";

const FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "Tümü" },
  { id: "new", label: ORDER_STATUS_LABELS.new },
  { id: "awaiting_payment", label: ORDER_STATUS_LABELS.awaiting_payment },
  { id: "accepted", label: ORDER_STATUS_LABELS.accepted },
  { id: "preparing", label: ORDER_STATUS_LABELS.preparing },
  { id: "shipped", label: ORDER_STATUS_LABELS.shipped },
  { id: "delivered", label: ORDER_STATUS_LABELS.delivered },
  { id: "cancelled", label: ORDER_STATUS_LABELS.cancelled },
];

async function loadRows(status?: string) {
  try {
    await ensureOrderStatusEnum();
    if (status && status !== "all") {
      return await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          grandTotal: orders.grandTotal,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.status, status as OrderStatus))
        .orderBy(desc(orders.createdAt))
        .limit(80);
    }

    return await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(80);
  } catch {
    return [];
  }
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const params = await searchParams;
  const filter =
    FILTERS.some((f) => f.id === params.durum) && params.durum
      ? params.durum
      : "all";
  const rows = await loadRows(filter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Siparişler</h1>
        <p className="text-sm text-[var(--bv-muted)]">
          Yeni → Kabul → Hazırlanıyor → Gönderildi → Teslim
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => {
          const active = filter === item.id;
          const href =
            item.id === "all"
              ? "/admin/orders"
              : `/admin/orders?durum=${item.id}`;
          return (
            <Link
              key={item.id}
              href={href}
              className={
                active
                  ? "shrink-0 rounded-[var(--radius-md)] bg-[var(--bv-ink)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white"
                  : "shrink-0 rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-[var(--bv-slate)] hover:bg-[var(--bv-fog)]"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden text-[10px] text-[var(--bv-muted)] sm:block">
        Akış: {ORDER_FLOW.map((s) => ORDER_STATUS_LABELS[s]).join(" → ")}
      </div>

      <AdminTable
        rows={rows}
        emptyMessage="Bu filtrede sipariş yok."
        columns={[
          {
            key: "number",
            header: "No",
            sortable: true,
            cell: (r) => (
              <Link
                href={`/admin/orders/${r.id}`}
                className="font-medium hover:underline"
              >
                {r.orderNumber}
              </Link>
            ),
          },
          {
            key: "status",
            header: "Durum",
            cell: (r) => <OrderStatusBadge status={r.status} />,
          },
          {
            key: "payment",
            header: "Ödeme",
            cell: (r) => <PaymentStatusBadge status={r.paymentStatus} />,
          },
          {
            key: "total",
            header: "Toplam",
            sortable: true,
            cell: (r) => formatCurrency(r.grandTotal),
          },
          {
            key: "date",
            header: "Tarih",
            cell: (r) =>
              new Date(r.createdAt).toLocaleDateString("tr-TR"),
          },
        ]}
      />
    </div>
  );
}
