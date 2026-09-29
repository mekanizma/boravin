import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

async function loadRows() {
  try {
    return await db.select({ id: campaigns.id, name: campaigns.name, slug: campaigns.slug, type: campaigns.type, status: campaigns.status }).from(campaigns).orderBy(desc(campaigns.updatedAt)).limit(50);
  } catch { return []; }
}

export default async function AdminCampaignsPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-semibold">Kampanyalar</h1><p className="text-sm text-[var(--bv-muted)]">Promosyon yönetimi</p></div>
        <Button variant="accent">Yeni kampanya</Button>
      </div>
      <AdminTable rows={rows} columns={[
        { key: "name", header: "Ad", sortable: true, cell: (r) => r.name },
        { key: "type", header: "Tip", cell: (r) => r.type },
        { key: "status", header: "Durum", cell: (r) => <Badge tone={r.status === "published" ? "success" : "neutral"}>{r.status}</Badge> },
        { key: "slug", header: "Slug", cell: (r) => r.slug },
      ]} />
    </div>
  );
}
