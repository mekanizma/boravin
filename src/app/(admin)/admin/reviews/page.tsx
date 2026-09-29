import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";

async function loadRows() {
  try {
    return await db.select({ id: reviews.id, authorName: reviews.authorName, rating: reviews.rating, title: reviews.title, status: reviews.status, createdAt: reviews.createdAt }).from(reviews).orderBy(desc(reviews.createdAt)).limit(50);
  } catch { return []; }
}

export default async function AdminReviewsPage() {
  const rows = await loadRows();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Yorumlar</h1>
        <p className="text-sm text-[var(--bv-muted)]">Ürün değerlendirmeleri</p>
      </div>
      <AdminTable rows={rows} columns={[
        { key: "author", header: "Yazar", cell: (r) => r.authorName ?? "—" },
        { key: "rating", header: "Puan", sortable: true, cell: (r) => r.rating },
        { key: "title", header: "Başlık", cell: (r) => r.title ?? "—" },
        { key: "status", header: "Durum", cell: (r) => <Badge tone={r.status === "approved" ? "success" : "warning"}>{r.status}</Badge> },
      ]} />
    </div>
  );
}
