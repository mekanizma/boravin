import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles, permissions, rolePermissions } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/admin/stats-card";

async function loadData() {
  try {
    const [roleRows, permRows, rp] = await Promise.all([
      db.select({ id: roles.id, code: roles.code, name: roles.name, description: roles.description }).from(roles).orderBy(asc(roles.name)),
      db.select({ id: permissions.id }).from(permissions),
      db.select().from(rolePermissions),
    ]);
    return { roleRows, permCount: permRows.length, rpCount: rp.length };
  } catch {
    return { roleRows: [], permCount: 0, rpCount: 0 };
  }
}

export default async function AdminRolesPage() {
  const { roleRows, permCount, rpCount } = await loadData();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Roller</h1>
          <p className="text-sm text-[var(--bv-muted)]">RBAC yönetimi</p>
        </div>
        <Button variant="accent">Rol ekle</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard label="Roller" value={roleRows.length} />
        <StatsCard label="İzinler" value={permCount} />
        <StatsCard label="Atamalar" value={rpCount} />
      </div>
      <AdminTable rows={roleRows} columns={[
        { key: "name", header: "Rol", sortable: true, cell: (r) => r.name },
        { key: "code", header: "Kod", cell: (r) => r.code },
        { key: "desc", header: "Açıklama", cell: (r) => r.description ?? "—" },
      ]} />
    </div>
  );
}
