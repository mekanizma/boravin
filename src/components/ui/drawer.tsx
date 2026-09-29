"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = "right",
  className,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "right" | "left" | "bottom";
  className?: string;
  bodyClassName?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const sideClass =
    side === "bottom"
      ? "bv-drawer-panel--bottom inset-x-0 bottom-0 max-h-[90dvh]"
      : side === "left"
        ? "bv-drawer-panel--left inset-y-0 left-0 h-full w-full max-w-[26rem]"
        : "bv-drawer-panel--right inset-y-0 right-0 h-full w-full max-w-[26rem]";

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        type="button"
        className="bv-drawer-backdrop absolute inset-0 bg-[#121417]/45 backdrop-blur-[2px]"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        className={cn(
          "bv-drawer-panel absolute flex flex-col bg-white shadow-[0_24px_64px_rgba(18,20,23,0.22)]",
          sideClass,
          className,
        )}
      >
        {title ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--bv-border)] px-5 py-4">
            <div className="min-w-0">{title}</div>
            <button
              type="button"
              aria-label="Kapat"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-[var(--bv-muted)] transition-colors hover:bg-[var(--bv-fog)] hover:text-[var(--bv-ink)]"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        ) : null}
        <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName ?? "p-4")}>
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-[var(--bv-border)] bg-white">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
