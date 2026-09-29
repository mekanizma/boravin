import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";

async function loadRows() {
  try {
    return await db.select({ id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, ip: auditLogs.ip, createdAt: auditLogs.createdAt }).from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(50);
  } catch { return []; }
}

export default async function AdminAuditPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Audit</h1>
        <p className="text-sm text-[var(--bv-muted)]">Değişiklik günlüğü</p>
      </div>
      <AdminTable rows={rows} columns={[
        { key: "action", header: "Aksiyon", sortable: true, cell: (r) => r.action },
        { key: "entity", header: "Varlık", cell: (r) => `${r.entityType}${r.entityId ? ` · ${r.entityId}` : ""}` },
        { key: "ip", header: "IP", cell: (r) => r.ip ?? "—" },
        { key: "date", header: "Tarih", cell: (r) => new Date(r.createdAt).toLocaleString("tr-TR") },
      ]} />
    </div>
  );
}
