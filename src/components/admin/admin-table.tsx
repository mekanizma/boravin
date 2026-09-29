import { cn } from "@/lib/utils";

export type AdminColumn<T extends object = Record<string, unknown>> = {
  key: string;
  label?: string;
  header?: string;
  className?: string;
  sortable?: boolean;
  cell?: (row: T) => React.ReactNode;
};

export function AdminTable<T extends object>({
  columns,
  rows,
  emptyMessage = "Kayıt bulunamadı",
}: {
  columns: AdminColumn<T>[];
  rows: T[];
  emptyMessage?: string;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--bv-border-strong)] p-10 text-center text-sm text-[var(--bv-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--bv-border)] bg-[var(--bv-concrete)]/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2.5 text-xs font-semibold tracking-wide text-[var(--bv-slate)] uppercase",
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
                className="border-b border-[var(--bv-border)] last:border-0 hover:bg-[var(--bv-concrete)]/30"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-3 py-3", col.className)}>
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
