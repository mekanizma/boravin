import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatsCard({
  label,
  value,
  hint,
  className,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
  href?: string;
}) {
  const body = (
    <div
      className={cn(
        "border border-[var(--bv-border)] bg-white p-4 sm:p-5",
        href && "transition-colors hover:border-[var(--bv-ink)]",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--bv-muted)]">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
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
