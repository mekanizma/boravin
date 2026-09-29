"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const POPULAR_KEYS = ["popular0", "popular1", "popular2", "popular3", "popular4"] as const;

export function MegaSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("Search");
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const popular = POPULAR_KEYS.map((key) => t(key));

  React.useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[var(--bv-paper)]" role="dialog" aria-modal="true">
      <div className="container-bv flex h-full flex-col py-4 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-lg font-semibold">{t("title")}</p>
          <Button variant="ghost" size="icon" aria-label={t("close")} onClick={onClose}>
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
              placeholder={t("placeholder")}
              className="h-12 pl-10 text-base"
              aria-label={t("aria")}
            />
          </div>
          <Button type="submit" variant="accent" size="lg" className="shrink-0">
            {t("submit")}
          </Button>
        </form>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--bv-muted)]">
            {t("popular")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {popular.map((term) => (
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
