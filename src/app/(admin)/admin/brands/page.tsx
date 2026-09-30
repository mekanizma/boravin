import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { NewBrandButton } from "@/components/admin/admin-create-entities";
import { Badge } from "@/components/ui/badge";

async function loadRows() {
  try {
    return await db
      .select({
        id: brands.id,
        name: brands.name,
        slug: brands.slug,
        isActive: brands.isActive,
      })
      .from(brands)
      .orderBy(asc(brands.name))
      .limit(100);
  } catch {
    return [];
  }
}

export default async function AdminBrandsPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Markalar</h1>
          <p className="text-sm text-[var(--bv-muted)]">Marka kataloğu</p>
        </div>
        <NewBrandButton />
      </div>
      <AdminTable
        rows={rows}
        columns={[
          { key: "name", header: "Ad", sortable: true, cell: (r) => r.name },
          { key: "slug", header: "Slug", cell: (r) => r.slug },
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
