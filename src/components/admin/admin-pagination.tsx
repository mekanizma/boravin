import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ADMIN_PAGE_SIZE = 50;

export function parsePage(raw: string | undefined, totalPages: number) {
  const n = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, totalPages));
}

export function AdminPagination({
  page,
  totalPages,
  totalItems,
  pageSize = ADMIN_PAGE_SIZE,
  hrefForPage,
  className,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  hrefForPage: (page: number) => string;
  className?: string;
}) {
  if (totalItems <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t border-[var(--bv-border)] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4",
        className,
      )}
    >
      <p className="text-xs text-[var(--bv-muted)]">
        <span className="tabular-nums font-medium text-[var(--bv-ink)]">
          {from}–{to}
        </span>{" "}
        / {totalItems} · Sayfa {page}/{totalPages}
      </p>
      <div className="flex items-center gap-2">
        {page <= 1 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 flex-1 gap-1 sm:flex-none"
            disabled
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            Önceki
          </Button>
        ) : (
          <Link href={hrefForPage(page - 1)} className="flex-1 sm:flex-none">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full gap-1"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              Önceki
            </Button>
          </Link>
        )}
        {page >= totalPages ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 flex-1 gap-1 sm:flex-none"
            disabled
          >
            Sonraki
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        ) : (
          <Link href={hrefForPage(page + 1)} className="flex-1 sm:flex-none">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full gap-1"
            >
              Sonraki
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
