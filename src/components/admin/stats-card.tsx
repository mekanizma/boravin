import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatsCard({
  label,
  value,
  hint,
  className,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
  href?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const body = (
    <div
      className={cn(
        "border border-[var(--bv-border)] bg-white p-4 sm:p-5",
        href && "transition-colors hover:border-[var(--bv-ink)]",
        tone === "warning" && "border-[var(--bv-warning)]/35",
        tone === "danger" && "border-[var(--bv-danger)]/35",
        tone === "success" && "border-[var(--bv-success)]/35",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--bv-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl",
          tone === "warning" && "text-[var(--bv-warning)]",
          tone === "danger" && "text-[var(--bv-danger)]",
          tone === "success" && "text-[var(--bv-success)]",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--bv-muted)]">{hint}</p>
      ) : null}
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
