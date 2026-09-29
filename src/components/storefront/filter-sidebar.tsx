"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryLabel } from "@/lib/storefront/use-category-label";
import {
  parseCatalogSort,
  type CatalogSort,
} from "@/lib/storefront/catalog-sort";

export type FilterOption = {
  id: string;
  label: string;
  href?: string;
  count?: number;
};

export type FilterGroup = {
  id: string;
  label: string;
  href?: string;
  options: FilterOption[];
};

function categorySlugFromPath(pathname: string) {
  if (!pathname.startsWith("/kategori/")) return null;
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

function FilterLinkRow({
  option,
  active,
  onNavigate,
}: {
  option: FilterOption;
  active: boolean;
  onNavigate?: () => void;
}) {
  const categoryLabel = useCategoryLabel();
  const href = option.href ?? `/kategori/${option.id}`;
  const label = categoryLabel({ slug: option.id, name: option.label });

  return (
    <li>
      <Link
        href={href}
        scroll={false}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex min-h-9 items-center gap-2.5 py-1.5 pr-2 pl-2.5 text-[13px] leading-snug transition-colors",
          active
            ? "bg-[var(--bv-sale-soft)] font-semibold text-[var(--bv-ink)]"
            : "text-[var(--bv-slate)] hover:bg-[var(--bv-fog)] hover:text-[var(--bv-ink)]",
        )}
      >
        <span
          className={cn(
            "absolute top-1.5 bottom-1.5 left-0 w-[2px] transition-colors",
            active ? "bg-[var(--bv-sale)]" : "bg-transparent group-hover:bg-[var(--bv-border-strong)]",
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1">{label}</span>
        {typeof option.count === "number" ? (
          <span className="shrink-0 text-[11px] tabular-nums text-[var(--bv-muted)]">
            {option.count}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function FilterGroupBlock({
  group,
  activeSlug,
  forceOpen,
  onNavigate,
}: {
  group: FilterGroup;
  activeSlug: string | null;
  forceOpen: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Filters");
  const categoryLabel = useCategoryLabel();
  const [open, setOpen] = React.useState(forceOpen);
  const groupActive = activeSlug === group.id;
  const childActive = group.options.some((o) => o.id === activeSlug);
  const label = categoryLabel({ slug: group.id, name: group.label });

  React.useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <section className="border-t border-[var(--bv-border)]">
      <div className="sticky top-0 z-[1] flex items-stretch bg-white/95 backdrop-blur-[2px]">
        <Link
          href={group.href ?? `/kategori/${group.id}`}
          scroll={false}
          onClick={onNavigate}
          aria-current={groupActive ? "page" : undefined}
          className={cn(
            "min-w-0 flex-1 py-3 text-left text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors",
            groupActive || childActive
              ? "text-[var(--bv-sale)]"
              : "text-[var(--bv-ink)] hover:text-[var(--bv-sale)]",
          )}
        >
          {label}
        </Link>
        <button
          type="button"
          className="flex w-9 shrink-0 items-center justify-center text-[var(--bv-muted)] hover:text-[var(--bv-ink)]"
          aria-expanded={open}
          aria-label={t("subcategoriesAria", { label })}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              open && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        </button>
      </div>

      {open ? (
        <ul className="space-y-0.5 pb-3">
          {group.options.map((option) => (
            <FilterLinkRow
              key={option.id}
              option={option}
              active={activeSlug === option.id}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function SortSelect({
  value,
  onChange,
}: {
  value: CatalogSort;
  onChange: (sort: CatalogSort) => void;
}) {
  const t = useTranslations("Filters");
  return (
    <section>
      <label
        htmlFor="catalog-sort"
        className="text-[11px] font-semibold tracking-[0.14em] text-[var(--bv-ink)] uppercase"
      >
        {t("sort")}
      </label>
      <select
        id="catalog-sort"
        value={value}
        onChange={(e) => onChange(parseCatalogSort(e.target.value))}
        className="mt-2.5 h-10 w-full border border-[var(--bv-border-strong)] bg-[var(--bv-fog)] px-2.5 text-[13px] font-medium text-[var(--bv-ink)] transition-colors focus-visible:border-[var(--bv-ink)] focus-visible:bg-white focus-visible:outline-none"
      >
        <option value="recommended">{t("sortRecommended")}</option>
        <option value="price_asc">{t("sortPriceAsc")}</option>
        <option value="price_desc">{t("sortPriceDesc")}</option>
      </select>
    </section>
  );
}

export function FilterSidebar({
  groups,
  onClear,
  priceMin,
  priceMax,
  onPriceChange,
  sort,
  onSortChange,
  className,
  showHeading = true,
  onNavigate,
}: {
  groups: FilterGroup[];
  selected?: Record<string, string[]>;
  onToggle?: (groupId: string, optionId: string) => void;
  onClear?: () => void;
  priceMin?: string;
  priceMax?: string;
  onPriceChange?: (min: string, max: string) => void;
  sort?: CatalogSort;
  onSortChange?: (sort: CatalogSort) => void;
  className?: string;
  showHeading?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Filters");
  const pathname = usePathname();
  const activeSlug = categorySlugFromPath(pathname);
  const sortValue = sort ?? "recommended";
  const hasActive =
    Boolean(activeSlug) ||
    Boolean(priceMin || priceMax) ||
    sortValue !== "recommended";
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root || !activeSlug) return;
    const active = root.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;

    const rootRect = root.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const padding = 12;
    if (activeRect.top < rootRect.top + padding) {
      root.scrollTop -= rootRect.top + padding - activeRect.top;
    } else if (activeRect.bottom > rootRect.bottom - padding) {
      root.scrollTop += activeRect.bottom - (rootRect.bottom - padding);
    }
  }, [activeSlug]);

  return (
    <aside
      className={cn(
        "bv-filter-panel flex min-h-0 flex-col overflow-hidden bg-white",
        className,
      )}
    >
      <div className="shrink-0 space-y-4 border-b border-[var(--bv-border)] pb-4">
        {showHeading ? (
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--bv-ink)]">
              {t("categories")}
            </h2>
            {onClear && hasActive ? (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-8 items-center gap-1 text-[12px] font-semibold text-[var(--bv-muted)] transition-colors hover:text-[var(--bv-ink)]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                {t("clear")}
              </button>
            ) : null}
          </div>
        ) : onClear && hasActive ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-8 items-center gap-1 text-[12px] font-semibold text-[var(--bv-muted)] transition-colors hover:text-[var(--bv-ink)]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
              {t("clear")}
            </button>
          </div>
        ) : null}

        <Link
          href="/urunler"
          scroll={false}
          onClick={onNavigate}
          aria-current={pathname === "/urunler" ? "page" : undefined}
          className={cn(
            "flex h-9 items-center px-2.5 text-[13px] font-semibold transition-colors",
            pathname === "/urunler"
              ? "bg-[var(--bv-sale-soft)] text-[var(--bv-sale)]"
              : "text-[var(--bv-slate)] hover:bg-[var(--bv-fog)] hover:text-[var(--bv-ink)]",
          )}
        >
          {t("allProducts")}
        </Link>

        <section>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--bv-ink)] uppercase">
            {t("price")}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[11px] font-medium text-[var(--bv-muted)]">
                ₺
              </span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={t("minPlaceholder")}
                value={priceMin ?? ""}
                onChange={(e) =>
                  onPriceChange?.(e.target.value, priceMax ?? "")
                }
                aria-label={t("minAria")}
                className="h-10 w-full border border-[var(--bv-border-strong)] bg-[var(--bv-fog)] pr-2 pl-6 text-[13px] text-[var(--bv-ink)] tabular-nums placeholder:text-[var(--bv-muted)] transition-colors focus-visible:border-[var(--bv-ink)] focus-visible:bg-white focus-visible:outline-none"
              />
            </label>
            <span className="shrink-0 text-[var(--bv-border-strong)]" aria-hidden>
              —
            </span>
            <label className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[11px] font-medium text-[var(--bv-muted)]">
                ₺
              </span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={t("maxPlaceholder")}
                value={priceMax ?? ""}
                onChange={(e) =>
                  onPriceChange?.(priceMin ?? "", e.target.value)
                }
                aria-label={t("maxAria")}
                className="h-10 w-full border border-[var(--bv-border-strong)] bg-[var(--bv-fog)] pr-2 pl-6 text-[13px] text-[var(--bv-ink)] tabular-nums placeholder:text-[var(--bv-muted)] transition-colors focus-visible:border-[var(--bv-ink)] focus-visible:bg-white focus-visible:outline-none"
              />
            </label>
          </div>
        </section>

        {onSortChange ? (
          <SortSelect value={sortValue} onChange={onSortChange} />
        ) : null}
      </div>

      <div ref={scrollRef} className="bv-filter-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {groups.map((group) => {
          const forceOpen =
            activeSlug === group.id ||
            group.options.some((o) => o.id === activeSlug);
          return (
            <FilterGroupBlock
              key={group.id}
              group={group}
              activeSlug={activeSlug}
              forceOpen={forceOpen}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>
    </aside>
  );
}
