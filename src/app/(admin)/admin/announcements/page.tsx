import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { NewAnnouncementButton } from "@/components/admin/admin-create-entities";
import {
  AnnouncementRowActions,
  type AnnouncementRow,
} from "@/components/admin/announcement-row-actions";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS: Record<string, string> = {
  top_bar: "Üst bar",
  popup: "Popup",
  homepage_banner: "Anasayfa banner",
  campaign_banner: "Kampanya banner",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  scheduled: "Zamanlanmış",
  published: "Yayında",
  archived: "Arşiv",
};

async function loadRows(): Promise<AnnouncementRow[]> {
  try {
    const rows = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        description: announcements.description,
        type: announcements.type,
        status: announcements.status,
        priority: announcements.priority,
        linkUrl: announcements.linkUrl,
        cta: announcements.cta,
      })
      .from(announcements)
      .orderBy(desc(announcements.updatedAt))
      .limit(50);
    return rows;
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
          <p className="text-sm text-[var(--bv-muted)]">
            Üst bar, popup ve anasayfa banner yönetimi
          </p>
        </div>
        <NewAnnouncementButton />
      </div>
      <AdminTable
        rows={rows}
        emptyMessage="Henüz duyuru yok"
        columns={[
          {
            key: "title",
            header: "Başlık",
            sortable: true,
            cell: (r) => (
              <div className="min-w-0 max-w-[16rem]">
                <p className="truncate font-medium">{r.title}</p>
                {r.description ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--bv-muted)]">
                    {r.description}
                  </p>
                ) : null}
              </div>
            ),
          },
          {
            key: "type",
            header: "Tip",
            cell: (r) => TYPE_LABELS[r.type] ?? r.type,
          },
          {
            key: "priority",
            header: "Öncelik",
            cell: (r) => r.priority,
          },
          {
            key: "status",
            header: "Durum",
            cell: (r) => (
              <Badge tone={r.status === "published" ? "success" : "neutral"}>
                {STATUS_LABELS[r.status] ?? r.status}
              </Badge>
            ),
          },
          {
            key: "actions",
            header: "İşlemler",
            className: "text-right",
            cell: (r) => <AnnouncementRowActions row={r} />,
          },
        ]}
      />
    </div>
  );
}
