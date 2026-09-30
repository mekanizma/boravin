import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { NewCategoryButton } from "@/components/admin/admin-create-entities";
import { Badge } from "@/components/ui/badge";

async function loadRows() {
  try {
    return await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        sortOrder: categories.sortOrder,
        isActive: categories.isActive,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder))
      .limit(100);
  } catch {
    return [];
  }
}

export default async function AdminCategoriesPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Kategoriler</h1>
          <p className="text-sm text-[var(--bv-muted)]">Hiyerarşi ve SEO</p>
        </div>
        <NewCategoryButton
          parents={rows.map((r) => ({ id: r.id, name: r.name }))}
        />
      </div>
      <AdminTable
        rows={rows}
        columns={[
          { key: "name", header: "Ad", sortable: true, cell: (r) => r.name },
          { key: "slug", header: "Slug", cell: (r) => r.slug },
          { key: "sort", header: "Sıra", cell: (r) => r.sortOrder },
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
