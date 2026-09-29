import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-[var(--bv-concrete)] text-[var(--bv-slate)]",
    accent: "bg-[var(--bv-copper)]/10 text-[var(--bv-copper)]",
    success: "bg-[var(--bv-success)]/10 text-[var(--bv-success)]",
    warning: "bg-[var(--bv-warning)]/10 text-[var(--bv-warning)]",
    danger: "bg-[var(--bv-danger)]/10 text-[var(--bv-danger)]",
    info: "bg-[var(--bv-steel-soft)] text-[var(--bv-steel)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
