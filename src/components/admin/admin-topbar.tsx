"use client";

import { LogOut, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logoutAdmin } from "@/features/auth/actions";

export function AdminTopbar({
  onMenuClick,
  title,
}: {
  onMenuClick?: () => void;
  title?: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-[var(--bv-border)] bg-[var(--bv-paper)]/95 px-3 backdrop-blur-sm sm:gap-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </Button>
      {title ? (
        <h1 className="hidden font-display text-base font-semibold sm:block">
          {title}
        </h1>
      ) : null}
      <div className="relative ml-auto min-w-0 w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bv-muted)]" />
        <Input
          placeholder="Admin’de ara…"
          className="h-9 pl-9"
          aria-label="Admin arama"
        />
      </div>
      <form action={logoutAdmin} className="shrink-0">
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 px-2.5 sm:px-3"
          aria-label="Çıkış yap"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Çıkış</span>
        </Button>
      </form>
    </header>
  );
}
