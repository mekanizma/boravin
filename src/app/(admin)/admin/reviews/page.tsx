import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, reviews } from "@/lib/db/schema";
import { AdminTable } from "@/components/admin/admin-table";
import { ReviewModerationActions } from "@/components/admin/review-moderation-actions";
import { Badge } from "@/components/ui/badge";
import {
  REVIEW_STATUS,
  REVIEW_STATUS_LABELS,
  type ReviewStatus,
} from "@/features/reviews/constants";

const FILTERS = [
  { id: "pending", label: "Onay bekleyen" },
  { id: "approved", label: "Yayında" },
  { id: "rejected", label: "Reddedilen" },
  { id: "all", label: "Tümü" },
] as const;

function statusTone(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "warning" as const;
}

function statusLabel(status: string) {
  if (status in REVIEW_STATUS_LABELS) {
    return REVIEW_STATUS_LABELS[status as ReviewStatus];
  }
  return status;
}

async function loadRows(filter: string) {
  try {
    const conditions = [];
    if (filter === "pending") {
      conditions.push(eq(reviews.status, REVIEW_STATUS.pending));
    } else if (filter === "approved") {
      conditions.push(eq(reviews.status, REVIEW_STATUS.approved));
    } else if (filter === "rejected") {
      conditions.push(eq(reviews.status, REVIEW_STATUS.rejected));
    }

    return await db
      .select({
        id: reviews.id,
        authorName: reviews.authorName,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        status: reviews.status,
        createdAt: reviews.createdAt,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(reviews.createdAt))
      .limit(80);
  } catch {
    return [];
  }
}

async function loadCounts() {
  try {
    const [row] = await db
      .select({
        pending: sql<number>`count(*) filter (where ${reviews.status} = 'pending')::int`,
        approved: sql<number>`count(*) filter (where ${reviews.status} = 'approved')::int`,
        rejected: sql<number>`count(*) filter (where ${reviews.status} = 'rejected')::int`,
        all: sql<number>`count(*)::int`,
      })
      .from(reviews);
    return (
      row ?? { pending: 0, approved: 0, rejected: 0, all: 0 }
    );
  } catch {
    return { pending: 0, approved: 0, rejected: 0, all: 0 };
  }
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const params = await searchParams;
  const filter = FILTERS.some((f) => f.id === params.durum)
    ? (params.durum as (typeof FILTERS)[number]["id"])
    : "pending";

  const [rows, counts] = await Promise.all([loadRows(filter), loadCounts()]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Yorumlar</h1>
        <p className="text-sm text-[var(--bv-muted)]">
          Onaylanan yorumlar ürün sayfasında yayınlanır
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const count = counts[item.id];
          const active = filter === item.id;
          return (
            <Link
              key={item.id}
              href={
                item.id === "pending"
                  ? "/admin/reviews"
                  : `/admin/reviews?durum=${item.id}`
              }
              className={
                active
                  ? "rounded-[var(--radius-md)] bg-[var(--bv-ink)] px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--bv-slate)] hover:bg-[var(--bv-fog)]"
              }
            >
              {item.label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </Link>
          );
        })}
      </div>

      <AdminTable
        rows={rows}
        emptyMessage={
          filter === "pending"
            ? "Onay bekleyen yorum yok."
            : "Bu filtrede yorum yok."
        }
        columns={[
          {
            key: "product",
            header: "Ürün",
            cell: (r) =>
              r.productSlug ? (
                <Link
                  href={`/urun/${r.productSlug}`}
                  className="font-medium text-[var(--bv-teal)] hover:underline"
                  target="_blank"
                >
                  {r.productName ?? "Ürün"}
                </Link>
              ) : (
                (r.productName ?? "—")
              ),
          },
          {
            key: "author",
            header: "Yazar",
            cell: (r) => r.authorName ?? "—",
          },
          {
            key: "rating",
            header: "Puan",
            cell: (r) => `${r.rating}/5`,
          },
          {
            key: "content",
            header: "Yorum",
            cell: (r) => (
              <div className="max-w-xs sm:max-w-sm">
                {r.title ? (
                  <p className="truncate text-sm font-medium">{r.title}</p>
                ) : null}
                <p className="line-clamp-2 text-xs text-[var(--bv-muted)]">
                  {r.body ?? "—"}
                </p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Durum",
            cell: (r) => (
              <Badge tone={statusTone(r.status)}>
                {statusLabel(r.status)}
              </Badge>
            ),
          },
          {
            key: "actions",
            header: "İşlem",
            cell: (r) => (
              <ReviewModerationActions id={r.id} status={r.status} />
            ),
          },
        ]}
      />
    </div>
  );
}
