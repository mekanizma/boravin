import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { NewCouponButton } from "@/components/admin/admin-create-entities";
import { Badge } from "@/components/ui/badge";

async function loadRows() {
  try {
    return await db
      .select({
        id: coupons.id,
        code: coupons.code,
        type: coupons.type,
        value: coupons.value,
        usageCount: coupons.usageCount,
        isActive: coupons.isActive,
      })
      .from(coupons)
      .orderBy(desc(coupons.createdAt))
      .limit(50);
  } catch {
    return [];
  }
}

export default async function AdminCouponsPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Kuponlar</h1>
          <p className="text-sm text-[var(--bv-muted)]">İndirim kodları</p>
        </div>
        <NewCouponButton />
      </div>
      <AdminTable
        rows={rows}
        columns={[
          {
            key: "code",
            header: "Kod",
            sortable: true,
            cell: (r) => <span className="font-mono text-sm">{r.code}</span>,
          },
          { key: "type", header: "Tip", cell: (r) => r.type },
          { key: "value", header: "Değer", cell: (r) => r.value },
          { key: "usage", header: "Kullanım", cell: (r) => r.usageCount },
          {
            key: "active",
            header: "Durum",
            cell: (r) => (
              <Badge tone={r.isActive ? "success" : "neutral"}>
                {r.isActive ? "Aktif" : "Pasif"}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
