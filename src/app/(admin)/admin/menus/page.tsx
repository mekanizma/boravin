import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { menus, menuItems } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { NewMenuButton } from "@/components/admin/admin-create-entities";

async function loadData() {
  try {
    const menuRows = await db
      .select({ id: menus.id, code: menus.code, name: menus.name })
      .from(menus)
      .orderBy(asc(menus.name));
    const itemCount = await db.select({ id: menuItems.id }).from(menuItems);
    return { menuRows, itemCount: itemCount.length };
  } catch {
    return { menuRows: [], itemCount: 0 };
  }
}

export default async function AdminMenusPage() {
  const { menuRows, itemCount } = await loadData();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Menü</h1>
          <p className="text-sm text-[var(--bv-muted)]">
            {itemCount} menü öğesi
          </p>
        </div>
        <NewMenuButton />
      </div>
      <AdminTable
        rows={menuRows}
        columns={[
          { key: "name", header: "Ad", sortable: true, cell: (r) => r.name },
          { key: "code", header: "Kod", cell: (r) => r.code },
        ]}
      />
    </div>
  );
}
