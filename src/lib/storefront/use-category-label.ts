import { useTranslations } from "next-intl";
import { categoryMessageKey } from "@/lib/storefront/category-i18n";
import type { CatalogNode } from "@/lib/storefront/catalog";

export function useCategoryLabel() {
  const t = useTranslations("CatalogCategories");
  return (node: Pick<CatalogNode, "slug" | "name"> | string) => {
    if (typeof node === "string") {
      const key = categoryMessageKey(node);
      return key ? t(key as never) : node;
    }
    const key = categoryMessageKey(node.slug);
    return key ? t(key as never) : node.name;
  };
}

export function translateCategoryName(
  t: (key: string) => string,
  node: Pick<CatalogNode, "slug" | "name">,
) {
  const key = categoryMessageKey(node.slug);
  return key ? t(key) : node.name;
}
