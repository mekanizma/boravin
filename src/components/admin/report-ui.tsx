import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { formatPercent } from "@/lib/reports/ranges";

export function ReportKpi({
  label,
  value,
  change,
  hint,
  href,
  tone,
}: {
  label: string;
  value: string | number;
  change?: number;
  hint?: string;
  href?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const body = (
    <div
      className={cn(
        "border border-[var(--bv-border)] bg-white p-4 sm:p-5",
        href && "transition-colors hover:border-[var(--bv-ink)]",
        tone === "warning" && "border-[var(--bv-warning)]/30",
        tone === "danger" && "border-[var(--bv-danger)]/30",
        tone === "success" && "border-[var(--bv-success)]/30",
      )}
    >
      <p className="text-xs font-semibold tracking-[0.12em] text-[var(--bv-muted)] uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {value}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {typeof change === "number" ? (
          <span
            className={cn(
              "text-xs font-semibold",
              change > 0
                ? "text-[var(--bv-success)]"
                : change < 0
                  ? "text-[var(--bv-danger)]"
                  : "text-[var(--bv-muted)]",
            )}
          >
            {formatPercent(change)} önceki dönem
          </span>
        ) : null}
        {hint ? (
          <span className="text-xs text-[var(--bv-muted)]">{hint}</span>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {body}
      </Link>
    );
  }
  return body;
}

export function ReportSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-[var(--bv-muted)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ReportEmpty({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-[var(--bv-muted)]">{message}</p>
  );
}

export function moneyCell(value: number) {
  return formatCurrency(value);
}
