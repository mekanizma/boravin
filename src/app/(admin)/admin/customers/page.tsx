import { desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { ensureAccountColumns } from "@/lib/account/columns";
import { syncCustomersFromAuth } from "@/lib/account/sync-customers";
import { AdminTable } from "@/components/admin/admin-table";
import { CustomerDiscountInput } from "@/components/admin/customer-discount-input";
import { CustomerSegmentCell } from "@/components/admin/customer-segment-cell";
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
  await ensureAccountColumns();
  await syncCustomersCached();

  return db
    .select({
      id: customers.id,
      email: customers.email,
      firstName: customers.firstName,
      lastName: customers.lastName,
      orderCount: customers.orderCount,
      totalSpent: customers.totalSpent,
      discountPercent: customers.discountPercent,
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
          Supabase Auth + müşteri kayıtları ({rows.length}). Özel % indirim
          giriş yaptığında sepete otomatik uygulanır.
        </p>
      </div>
      <AdminTable
        rows={rows}
        columns={[
          {
            key: "name",
            header: "Ad",
            sortable: true,
            className: "min-w-[7rem] max-w-[10rem]",
            cell: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}
                </p>
                <p className="truncate text-[11px] text-[var(--bv-muted)] md:hidden">
                  {r.email}
                </p>
              </div>
            ),
          },
          {
            key: "discount",
            header: "Özel indirim",
            className: "min-w-[9.5rem]",
            cell: (r) => (
              <CustomerDiscountInput
                customerId={r.id}
                value={r.discountPercent}
              />
            ),
          },
          {
            key: "segment",
            header: "Durum",
            className: "min-w-[8.5rem]",
            cell: (r) => (
              <CustomerSegmentCell
                segment={r.segment}
                orderCount={r.orderCount}
                totalSpent={r.totalSpent}
              />
            ),
          },
          {
            key: "email",
            header: "E-posta",
            hideOnMobile: true,
            cell: (r) => r.email,
          },
          {
            key: "phone",
            header: "Telefon",
            hideOnMobile: true,
            cell: (r) => r.phone ?? "—",
          },
          {
            key: "type",
            header: "Tür",
            hideOnMobile: true,
            cell: (r) =>
              r.accountType === "corporate" ? "Kurumsal" : "Bireysel",
          },
          {
            key: "company",
            header: "Ünvan",
            hideOnMobile: true,
            cell: (r) => r.companyTitle ?? "—",
          },
          {
            key: "orders",
            header: "Sipariş",
            hideOnMobile: true,
            cell: (r) => r.orderCount,
          },
          {
            key: "spent",
            header: "Harcama",
            hideOnMobile: true,
            cell: (r) => formatCurrency(r.totalSpent),
          },
        ]}
      />
    </div>
  );
}
