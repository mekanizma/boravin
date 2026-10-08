import { Badge } from "@/components/ui/badge";
import { resolveCustomerSegment } from "@/lib/customers/segment";

export function CustomerSegmentCell({
  segment,
  orderCount,
  totalSpent,
}: {
  segment: string | null;
  orderCount: number;
  totalSpent: string | number;
}) {
  const info = resolveCustomerSegment({ segment, orderCount, totalSpent });

  return (
    <div className="min-w-[8.5rem] max-w-[12rem]">
      <Badge tone={info.tone}>{info.label}</Badge>
      <p className="mt-1 text-[11px] leading-snug text-[var(--bv-muted)]">
        {info.description}
      </p>
    </div>
  );
}
