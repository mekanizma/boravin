import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

async function loadRows() {
  try {
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
      .limit(50);
  } catch {
    return [];
  }
}

export default async function AdminOrdersPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Siparişler</h1>
        <p className="text-sm text-[var(--bv-muted)]">Sipariş akışı</p>
      </div>
      <AdminTable
        rows={rows}
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
            cell: (r) => <Badge tone="info">{r.status}</Badge>,
          },
          {
            key: "payment",
            header: "Ödeme",
            cell: (r) => <Badge tone="neutral">{r.paymentStatus}</Badge>,
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
