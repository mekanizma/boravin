import { cn } from "@/lib/utils";

export type AdminColumn<T extends object = Record<string, unknown>> = {
  key: string;
  label?: string;
  header?: string;
  className?: string;
  sortable?: boolean;
  /** Hide column below md breakpoint (mobile). */
  hideOnMobile?: boolean;
  cell?: (row: T) => React.ReactNode;
};

export function AdminTable<T extends object>({
  columns,
  rows,
  emptyMessage = "Kayıt bulunamadı",
  stickyFirstColumn = true,
}: {
  columns: AdminColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  stickyFirstColumn?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--bv-border-strong)] p-6 text-center text-sm text-[var(--bv-muted)] sm:p-10">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white [-webkit-overflow-scrolling:touch]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--bv-border)] bg-[var(--bv-concrete)]/50">
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-[var(--bv-slate)] uppercase",
                  col.hideOnMobile && "hidden md:table-cell",
                  stickyFirstColumn &&
                    index === 0 &&
                    "sticky left-0 z-10 bg-[var(--bv-concrete)] shadow-[1px_0_0_var(--bv-border)]",
                  col.className,
                )}
              >
                {col.header ?? col.label ?? col.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const key =
              "id" in row && row.id != null ? String(row.id) : String(i);
            return (
              <tr
                key={key}
                className="group border-b border-[var(--bv-border)] last:border-0 hover:bg-[var(--bv-concrete)]/30"
              >
                {columns.map((col, index) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-3",
                      col.hideOnMobile && "hidden md:table-cell",
                      stickyFirstColumn &&
                        index === 0 &&
                        "sticky left-0 z-10 bg-white group-hover:bg-[var(--bv-concrete)]/30 shadow-[1px_0_0_var(--bv-border)]",
                      col.className,
                    )}
                  >
                    {col.cell
                      ? col.cell(row)
                      : ((row as Record<string, React.ReactNode>)[col.key] ??
                        null)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
