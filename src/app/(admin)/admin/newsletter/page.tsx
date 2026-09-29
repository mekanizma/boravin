import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";

async function loadRows() {
  try {
    return await db.select({ id: newsletterSubscribers.id, email: newsletterSubscribers.email, isActive: newsletterSubscribers.isActive, createdAt: newsletterSubscribers.createdAt }).from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(50);
  } catch { return []; }
}

export default async function AdminNewsletterPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Newsletter</h1>
        <p className="text-sm text-[var(--bv-muted)]">Aboneler</p>
      </div>
      <AdminTable rows={rows} columns={[
        { key: "email", header: "E-posta", sortable: true, cell: (r) => r.email },
        { key: "active", header: "Durum", cell: (r) => <Badge tone={r.isActive ? "success" : "neutral"}>{r.isActive ? "Aktif" : "Pasif"}</Badge> },
        { key: "date", header: "Tarih", cell: (r) => new Date(r.createdAt).toLocaleDateString("tr-TR") },
      ]} />
    </div>
  );
}
