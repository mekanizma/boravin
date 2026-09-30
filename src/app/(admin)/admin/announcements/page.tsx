import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { NewAnnouncementButton } from "@/components/admin/admin-create-entities";
import { Badge } from "@/components/ui/badge";

async function loadRows() {
  try {
    return await db
      .select({
        id: announcements.id,
        title: announcements.title,
        type: announcements.type,
        status: announcements.status,
        priority: announcements.priority,
      })
      .from(announcements)
      .orderBy(desc(announcements.updatedAt))
      .limit(50);
  } catch {
    return [];
  }
}

export default async function AdminAnnouncementsPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Duyurular</h1>
          <p className="text-sm text-[var(--bv-muted)]">Bar, popup ve banner</p>
        </div>
        <NewAnnouncementButton />
      </div>
      <AdminTable
        rows={rows}
        columns={[
          {
            key: "title",
            header: "Başlık",
            sortable: true,
            cell: (r) => r.title,
          },
          { key: "type", header: "Tip", cell: (r) => r.type },
          { key: "priority", header: "Öncelik", cell: (r) => r.priority },
          {
            key: "status",
            header: "Durum",
            cell: (r) => (
              <Badge tone={r.status === "published" ? "success" : "neutral"}>
                {r.status}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
