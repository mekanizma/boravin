"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNavLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={onNavigate}
      onMouseEnter={() => {
        router.prefetch(href);
      }}
      onFocus={() => {
        router.prefetch(href);
      }}
      onTouchStart={() => {
        router.prefetch(href);
      }}
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--bv-ink)] text-white"
          : "text-[var(--bv-slate)] hover:bg-[var(--bv-concrete)] hover:text-[var(--bv-ink)]",
      )}
    >
      {children}
    </Link>
  );
}
