import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let order: typeof orders.$inferSelect | null = null;
  let items: (typeof orderItems.$inferSelect)[] = [];

  try {
    order =
      (await db.query.orders.findFirst({
        where: eq(orders.id, id),
      })) ?? null;
    if (order) {
      items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
    }
  } catch {
    order = null;
  }

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Sipariş {order.orderNumber}
          </h1>
          <div className="mt-2 flex gap-2">
            <Badge>{order.status}</Badge>
            <Badge tone="info">{order.paymentStatus}</Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
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
      <div className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
        <p className="text-sm">
          Toplam: <strong>{formatCurrency(Number(order.grandTotal))}</strong>
        </p>
        <p className="mt-1 text-sm text-[var(--bv-muted)]">{order.guestEmail}</p>
      </div>
      <ul className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between text-sm">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <span>{formatCurrency(Number(item.total))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
