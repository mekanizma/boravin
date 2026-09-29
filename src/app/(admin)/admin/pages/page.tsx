import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

async function loadRows() {
  try {
    return await db.select({ id: pages.id, title: pages.title, slug: pages.slug, status: pages.status }).from(pages).orderBy(desc(pages.updatedAt)).limit(50);
  } catch { return []; }
}

export default async function AdminPagesPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-semibold">Sayfalar</h1><p className="text-sm text-[var(--bv-muted)]">Statik içerik</p></div>
        <Button variant="accent">Yeni sayfa</Button>
      </div>
      <AdminTable rows={rows} columns={[
        { key: "title", header: "Başlık", sortable: true, cell: (r) => r.title },
        { key: "slug", header: "Slug", cell: (r) => r.slug },
        { key: "status", header: "Durum", cell: (r) => <Badge tone={r.status === "published" ? "success" : "neutral"}>{r.status}</Badge> },
      ]} />
    </div>
  );
}
