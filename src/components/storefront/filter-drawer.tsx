"use client";

import { Drawer } from "@/components/ui/drawer";
import {
  FilterSidebar,
  type FilterGroup,
} from "@/components/storefront/filter-sidebar";

export function FilterDrawer({
  open,
  onClose,
  groups,
  onClear,
  priceMin,
  priceMax,
  onPriceChange,
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
  onNavigate?: () => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="Kategoriler" side="left">
      <div className="flex h-[min(70dvh,32rem)] flex-col">
        <FilterSidebar
          className="h-full min-h-0"
          groups={groups}
          onClear={onClear}
          priceMin={priceMin}
          priceMax={priceMax}
          onPriceChange={onPriceChange}
          showHeading={false}
          onNavigate={onNavigate ?? onClose}
        />
      </div>
    </Drawer>
  );
}
