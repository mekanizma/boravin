import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { orderItems, orderStatusHistory, orders } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
import { OrderStatusManager } from "@/components/admin/order-status-manager";
import { OrderStatusTimeline } from "@/components/admin/order-status-timeline";
import { ensureOrderStatusEnum } from "@/lib/orders/ensure";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let order: typeof orders.$inferSelect | null = null;
  let items: (typeof orderItems.$inferSelect)[] = [];
  let history: (typeof orderStatusHistory.$inferSelect)[] = [];

  try {
    await ensureOrderStatusEnum();
    order =
      (await db.query.orders.findFirst({
        where: eq(orders.id, id),
      })) ?? null;
    if (order) {
      [items, history] = await Promise.all([
        db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
        db
          .select()
          .from(orderStatusHistory)
          .where(eq(orderStatusHistory.orderId, order.id))
          .orderBy(desc(orderStatusHistory.createdAt)),
      ]);
    }
  } catch {
    order = null;
  }

  if (!order) notFound();

  const billing = (order.billingAddress ?? {}) as Record<string, string>;
  const shipping = (order.shippingAddress ?? {}) as Record<string, string>;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Sipariş {order.orderNumber}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          <p className="mt-2 text-xs text-[var(--bv-muted)]">
            {new Date(order.createdAt).toLocaleString("tr-TR")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={`/admin/invoices/new?orderId=${order.id}&type=invoice`}
            className="w-full sm:w-auto"
          >
            <Button variant="accent" className="w-full sm:w-auto">
              Fatura kes
            </Button>
          </Link>
          <Link
            href={`/admin/invoices/new?orderId=${order.id}&type=receipt`}
            className="w-full sm:w-auto"
          >
            <Button variant="outline" className="w-full sm:w-auto">
              Makbuz kes
            </Button>
          </Link>
          <Link href="/admin/orders" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              Listeye dön
            </Button>
          </Link>
        </div>
      </div>

      <OrderStatusManager
        orderId={order.id}
        status={order.status}
        trackingNumber={order.trackingNumber}
        shippingCarrier={order.shippingCarrier}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
          <h2 className="text-sm font-semibold">Özet</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--bv-muted)]">Toplam</dt>
              <dd className="font-semibold">
                {formatCurrency(Number(order.grandTotal))}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--bv-muted)]">Ödeme</dt>
              <dd>{order.paymentMethod ?? "—"}</dd>
            </div>
            {order.shippingCarrier ? (
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--bv-muted)]">Kargo</dt>
                <dd>{order.shippingCarrier}</dd>
              </div>
            ) : null}
            {order.trackingNumber ? (
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--bv-muted)]">Takip no</dt>
                <dd className="font-medium">{order.trackingNumber}</dd>
              </div>
            ) : null}
            {order.guestEmail ? (
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--bv-muted)]">E-posta</dt>
                <dd className="truncate">{order.guestEmail}</dd>
              </div>
            ) : null}
            {order.adminNote ? (
              <div>
                <dt className="text-[var(--bv-muted)]">Admin notu</dt>
                <dd className="mt-1 whitespace-pre-wrap">{order.adminNote}</dd>
              </div>
            ) : null}
            {order.customerNote ? (
              <div>
                <dt className="text-[var(--bv-muted)]">Müşteri notu</dt>
                <dd className="mt-1 whitespace-pre-wrap">{order.customerNote}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
          <h2 className="text-sm font-semibold">Adres</h2>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--bv-muted)] uppercase">
                Teslimat
              </p>
              <p className="mt-1 font-medium">
                {shipping.fullName || billing.fullName || "—"}
              </p>
              <p className="text-[var(--bv-slate)]">
                {[shipping.line1 || shipping.addressLine1, shipping.district, shipping.city]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
              {shipping.phone || billing.phone ? (
                <p className="text-[var(--bv-muted)]">
                  {shipping.phone || billing.phone}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
        <h2 className="text-sm font-semibold">Ürünler</h2>
        <ul className="mt-3 divide-y divide-[var(--bv-border)]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 py-2.5 text-sm"
            >
              <span className="min-w-0">
                <span className="font-medium">{item.productName}</span>
                {item.variantName ? (
                  <span className="text-[var(--bv-muted)]">
                    {" "}
                    ({item.variantName})
                  </span>
                ) : null}
                <span className="mt-0.5 block text-xs text-[var(--bv-muted)]">
                  {item.sku ? `${item.sku} · ` : ""}× {item.quantity}
                </span>
              </span>
              <span className="shrink-0 font-medium">
                {formatCurrency(Number(item.total))}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
        <h2 className="text-sm font-semibold">Durum geçmişi</h2>
        <div className="mt-4">
          <OrderStatusTimeline
            rows={history.map((row) => ({
              id: row.id,
              fromStatus: row.fromStatus,
              toStatus: row.toStatus,
              note: row.note,
              createdAt: row.createdAt,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
