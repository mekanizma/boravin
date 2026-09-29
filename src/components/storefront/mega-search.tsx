"use client";

import * as React from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function MegaSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[var(--bv-paper)]" role="dialog" aria-modal="true">
      <div className="container-bv flex h-full flex-col py-4 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-lg font-semibold">Ara</p>
          <Button variant="ghost" size="icon" aria-label="Kapat" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form
          className="mt-6 flex gap-2"
          action="/urunler"
          onSubmit={onClose}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bv-muted)]" />
            <Input
              ref={inputRef}
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün, marka veya kategori ara…"
              className="h-12 pl-10 text-base"
              aria-label="Arama"
            />
          </div>
          <Button type="submit" variant="accent" size="lg" className="shrink-0">
            Ara
          </Button>
        </form>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--bv-muted)]">
            Popüler
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Laptop", "Kulaklık", "iPhone", "Monitor", "SSD"].map((term) => (
              <Link
                key={term}
                href={`/urunler?q=${encodeURIComponent(term)}`}
                onClick={onClose}
                className="rounded-[var(--radius-md)] border border-[var(--bv-border)] bg-white px-3 py-2 text-sm text-[var(--bv-slate)] hover:border-[var(--bv-border-strong)] hover:text-[var(--bv-ink)]"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
