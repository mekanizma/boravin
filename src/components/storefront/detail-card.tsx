import { cn } from "@/lib/utils";

export function DetailCard({
  children,
  className,
  stageClassName,
}: {
  children: React.ReactNode;
  className?: string;
  stageClassName?: string;
}) {
  return (
    <div className={cn("px-1 pt-2 pb-5 sm:pb-6", stageClassName)}>
      <div className={cn("bv-detail-slab", className)}>{children}</div>
    </div>
  );
}
