import { desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { syncCustomersFromAuth } from "@/lib/account/sync-customers";
import { AdminTable } from "@/components/admin/admin-table";
import { formatCurrency } from "@/lib/utils";

/** Avoid full Auth listUsers sync on every tab visit. */
const syncCustomersCached = unstable_cache(
  async () => {
    try {
      await syncCustomersFromAuth();
    } catch (error) {
      console.error("[admin/customers] auth sync failed", error);
    }
    return true;
  },
  ["admin-customers-auth-sync-v1"],
  { revalidate: 300, tags: ["admin-customers"] },
);

async function loadRows() {
  await syncCustomersCached();

  return db
    .select({
      id: customers.id,
      email: customers.email,
      firstName: customers.firstName,
      lastName: customers.lastName,
      orderCount: customers.orderCount,
      totalSpent: customers.totalSpent,
      segment: customers.segment,
      accountType: customers.accountType,
      companyTitle: customers.companyTitle,
      phone: customers.phone,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .orderBy(desc(customers.createdAt))
    .limit(200);
}

export default async function AdminCustomersPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Müşteriler</h1>
        <p className="text-sm text-[var(--bv-muted)]">
          Supabase Auth + müşteri kayıtları ({rows.length})
        </p>
      </div>
      <AdminTable
        rows={rows}
        columns={[
          {
            key: "name",
            header: "Ad",
            sortable: true,
            cell: (r) =>
              [r.firstName, r.lastName].filter(Boolean).join(" ") || "—",
          },
          { key: "email", header: "E-posta", cell: (r) => r.email },
          {
            key: "phone",
            header: "Telefon",
            cell: (r) => r.phone ?? "—",
          },
          {
            key: "type",
            header: "Tür",
            cell: (r) =>
              r.accountType === "corporate" ? "Kurumsal" : "Bireysel",
          },
          {
            key: "company",
            header: "Ünvan",
            cell: (r) => r.companyTitle ?? "—",
          },
          { key: "orders", header: "Sipariş", cell: (r) => r.orderCount },
          {
            key: "spent",
            header: "Harcama",
            cell: (r) => formatCurrency(r.totalSpent),
          },
          { key: "segment", header: "Segment", cell: (r) => r.segment ?? "—" },
        ]}
      />
    </div>
  );
}
