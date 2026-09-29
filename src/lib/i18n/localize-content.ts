import { getLocale } from "next-intl/server";
import { categoryMessageKey } from "@/lib/storefront/category-i18n";
import { findCategoryByName, flattenCategories } from "@/lib/storefront/catalog";
import type { AppLocale } from "@/i18n/config";

/** Known Turkish CMS / homepage copy → message keys under Home */
const HOME_TITLE_KEYS: Record<string, string> = {
  "Öne çıkanlar": "featuredTitle",
  "Öne çıkan ürünler": "featuredTitle",
  "Öne çıkan hazır sistemler": "featuredTitle",
  "Editör seçkisi": "vitrineTitle",
  "Bu haftanın vitrini": "vitrineTitle",
  "Stok ve kampanya haberleri": "newsletterTitle",
  "Kampanya ve stok haberleri": "newsletterTitle",
  "Sadece önemli duyurular": "newsletterSubtitle",
  "Sadece fiyat ve stok duyuruları. İstediğin zaman çık.": "newsletterSubtitle",
  "Boravin’de sizin için seçilen ürünlere göz atın.": "featuredSubtitle",
  "Stoktaki telefon, laptop ve ekipman.": "vitrineSubtitle",
};

/** Extra short labels used in mocks / DB category chips */
const CATEGORY_NAME_KEYS: Record<string, string> = {
  "Ev Bakım": "homeCare",
  "Ev/Bakım Ürünleri": "homeCare",
  Telefon: "phonesEcosystem",
  Bilgisayar: "computers",
  Gaming: "consoles",
};

export async function getStorefrontLocale(): Promise<AppLocale> {
  return (await getLocale()) as AppLocale;
}

/**
 * Prefer translated chrome for EN; keep admin/DB Turkish titles for TR.
 */
export function localizeHomeCopy(
  locale: AppLocale,
  dbValue: string | null | undefined,
  t: (key: string) => string,
  fallbackKey: string,
) {
  if (locale === "en") {
    if (dbValue && HOME_TITLE_KEYS[dbValue]) {
      return t(HOME_TITLE_KEYS[dbValue]!);
    }
    return t(fallbackKey);
  }
  return dbValue?.trim() || t(fallbackKey);
}

export function localizeCategoryTitle(
  locale: AppLocale,
  title: string,
  tc: (key: string) => string,
) {
  if (locale !== "en") return title;

  const byExtra = CATEGORY_NAME_KEYS[title];
  if (byExtra) return tc(byExtra);

  const byName = findCategoryByName(title);
  if (byName) {
    const key = categoryMessageKey(byName.slug);
    if (key) return tc(key);
  }

  // Partial / truncated titles from DB
  const match = flattenCategories().find(
    (node) =>
      node.name === title ||
      node.name.startsWith(title) ||
      title.startsWith(node.name),
  );
  if (match) {
    const key = categoryMessageKey(match.slug);
    if (key) return tc(key);
  }

  return title;
}
