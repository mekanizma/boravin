"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--bv-border-strong)] bg-[var(--bv-concrete)]/40 px-6 py-16 text-center",
        className,
      )}
    >
      <h3 className="text-lg font-medium text-[var(--bv-ink)]">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-[var(--bv-muted)]">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="accent" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
