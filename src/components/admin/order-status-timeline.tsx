import { orderStatusLabel } from "@/lib/orders/status";

type HistoryRow = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: Date;
};

export function OrderStatusTimeline({ rows }: { rows: HistoryRow[] }) {
  if (!rows.length) {
    return (
      <p className="text-sm text-[var(--bv-muted)]">
        Henüz durum geçmişi yok.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.id}
          className="relative border-l-2 border-[var(--bv-border)] pl-4"
        >
          <span className="absolute top-1.5 -left-[5px] h-2.5 w-2.5 rounded-full bg-[var(--bv-ink)]" />
          <p className="text-sm font-medium">
            {row.fromStatus
              ? `${orderStatusLabel(row.fromStatus)} → ${orderStatusLabel(row.toStatus)}`
              : orderStatusLabel(row.toStatus)}
          </p>
          {row.note ? (
            <p className="mt-0.5 text-xs text-[var(--bv-muted)]">{row.note}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-[var(--bv-muted)]">
            {new Date(row.createdAt).toLocaleString("tr-TR")}
          </p>
        </li>
      ))}
    </ol>
  );
}
