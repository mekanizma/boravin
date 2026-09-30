"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "bv-announcement-dismissed:";

export function AnnouncementPopup({
  announcement,
}: {
  announcement: {
    id: string;
    title: string;
    description?: string | null;
    linkUrl?: string | null;
    cta?: string | null;
  } | null;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!announcement?.id) return;
    try {
      if (window.localStorage.getItem(`${STORAGE_PREFIX}${announcement.id}`)) {
        return;
      }
    } catch {
      // ignore storage errors
    }
    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [announcement?.id]);

  const dismiss = React.useCallback(() => {
    setOpen(false);
    if (!announcement?.id) return;
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${announcement.id}`, "1");
    } catch {
      // ignore
    }
  }, [announcement?.id]);

  if (!open || !announcement) return null;

  const href = announcement.linkUrl?.trim() || null;
  const cta = announcement.cta?.trim() || "İncele";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bv-announcement-title"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md rounded-t-[1.25rem] bg-white p-5 shadow-[0_24px_48px_rgba(18,20,23,0.28)] sm:rounded-[1.25rem] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="bv-announcement-title"
            className="text-lg font-bold tracking-tight text-[#121417] sm:text-xl"
          >
            {announcement.title}
          </h2>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#666] hover:bg-[#f4f6f8]"
            aria-label="Kapat"
            onClick={dismiss}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {announcement.description ? (
          <p className="mt-2 text-sm leading-relaxed text-[#555]">
            {announcement.description}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={dismiss} className="w-full sm:w-auto">
            Kapat
          </Button>
          {href ? (
            <Link
              href={href}
              onClick={dismiss}
              className={cn(buttonVariants(), "w-full sm:w-auto")}
            >
              {cta}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
