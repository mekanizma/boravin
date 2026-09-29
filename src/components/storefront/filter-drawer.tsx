"use client";

import { useTranslations } from "next-intl";
import { Drawer } from "@/components/ui/drawer";
import {
  FilterSidebar,
  type FilterGroup,
} from "@/components/storefront/filter-sidebar";
import type { CatalogSort } from "@/lib/storefront/catalog-sort";

export function FilterDrawer({
  open,
  onClose,
  groups,
  onClear,
  priceMin,
  priceMax,
  onPriceChange,
  sort,
  onSortChange,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  groups: FilterGroup[];
  selected?: Record<string, string[]>;
  onToggle?: (groupId: string, optionId: string) => void;
  onClear?: () => void;
  priceMin?: string;
  priceMax?: string;
  onPriceChange?: (min: string, max: string) => void;
  sort?: CatalogSort;
  onSortChange?: (sort: CatalogSort) => void;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Filters");
  return (
    <Drawer open={open} onClose={onClose} title={t("drawerTitle")} side="left">
      <div className="flex h-[min(70dvh,32rem)] flex-col">
        <FilterSidebar
          className="h-full min-h-0"
          groups={groups}
          onClear={onClear}
          priceMin={priceMin}
          priceMax={priceMax}
          onPriceChange={onPriceChange}
          sort={sort}
          onSortChange={onSortChange}
          showHeading={false}
          onNavigate={onNavigate ?? onClose}
        />
      </div>
    </Drawer>
  );
}
