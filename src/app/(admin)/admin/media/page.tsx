import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { NewMediaButton } from "@/components/admin/admin-create-entities";

async function loadRows() {
  try {
    return await db
      .select({
        id: media.id,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.size,
        folder: media.folder,
        url: media.url,
      })
      .from(media)
      .orderBy(desc(media.createdAt))
      .limit(50);
  } catch {
    return [];
  }
}

export default async function AdminMediaPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Medya</h1>
          <p className="text-sm text-[var(--bv-muted)]">Dosya kütüphanesi</p>
        </div>
        <NewMediaButton />
      </div>
      <AdminTable
        rows={rows}
        columns={[
          {
            key: "name",
            header: "Dosya",
            sortable: true,
            cell: (r) => r.originalName,
          },
          { key: "type", header: "Tür", cell: (r) => r.mimeType ?? "—" },
          { key: "folder", header: "Klasör", cell: (r) => r.folder ?? "—" },
          {
            key: "size",
            header: "Boyut",
            cell: (r) => (r.size ? `${Math.round(r.size / 1024)} KB` : "—"),
          },
        ]}
      />
    </div>
  );
}
