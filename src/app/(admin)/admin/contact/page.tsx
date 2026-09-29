import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";

async function loadRows() {
  try {
    return await db.select({ id: contactMessages.id, name: contactMessages.name, email: contactMessages.email, subject: contactMessages.subject, status: contactMessages.status, createdAt: contactMessages.createdAt }).from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(50);
  } catch { return []; }
}

export default async function AdminContactPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">İletişim</h1>
        <p className="text-sm text-[var(--bv-muted)]">Gelen mesajlar</p>
      </div>
      <AdminTable rows={rows} columns={[
        { key: "name", header: "Ad", cell: (r) => r.name },
        { key: "email", header: "E-posta", cell: (r) => r.email },
        { key: "subject", header: "Konu", cell: (r) => r.subject ?? "—" },
        { key: "status", header: "Durum", cell: (r) => <Badge tone={r.status === "new" ? "accent" : "neutral"}>{r.status}</Badge> },
      ]} />
    </div>
  );
}
