/**
 * MOCK DATA — temporary preview content for storefront.
 * Marker: tags include "mock" | sku starts with BV-MOCK- | orderNumber starts with BVSEED
 * Clear with: npm run db:clear-mock
 * Or tell the agent: "sil" / "mock verileri sil"
 */

import type { ProductCardData } from "@/components/storefront/product-card";

export const MOCK_TAG = "mock";
export const MOCK_SKU_PREFIX = "BV-MOCK-";
export const MOCK_ORDER_PREFIX = "BVSEED";

export const MOCK_PRODUCTS: ProductCardData[] = [
  {
    id: "mock-iphone-16-pro",
    name: "iPhone 16 Pro 256GB",
    slug: "iphone-16-pro-1",
    aliases: ["iphone-16-pro-256gb-mock"],
    price: 73605,
    compareAtPrice: 79990,
    isNew: true,
    isFeatured: true,
    isCampaign: true,
    brandName: "Apple",
    imageUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&h=1100&q=80",
    hoverImageUrl:
      "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&h=1100&q=80",
  },
  {
    id: "mock-macbook-air-m3",
    name: "MacBook Air 13 M3",
    slug: "macbook-air-m3-5",
    aliases: ["macbook-air-13-m3-mock"],
    price: 54990,
    compareAtPrice: null,
    isNew: true,
    isFeatured: true,
    brandName: "Apple",
    imageUrl:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&h=1100&q=80",
    hoverImageUrl:
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=900&h=1100&q=80",
  },
  {
    id: "mock-s26-ultra",
    name: "Samsung Galaxy S26 Ultra",
    slug: "samsung-s26-ultra-3",
    aliases: ["samsung-s26-ultra-mock"],
    price: 53977,
    compareAtPrice: 58990,
    isCampaign: true,
    isFeatured: true,
    brandName: "Samsung",
    imageUrl:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&h=1100&q=80",
    hoverImageUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&h=1100&q=80",
  },
  {
    id: "mock-asus-tuf",
    name: "ASUS TUF Gaming A15",
    slug: "asus-tuf-a15-7",
    aliases: ["asus-tuf-a15-mock"],
    price: 53977,
    isFeatured: true,
    brandName: "ASUS",
    imageUrl:
      "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=900&h=1100&q=80",
    hoverImageUrl:
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&h=1100&q=80",
  },
  {
    id: "mock-airpods-pro",
    name: "AirPods Pro 3",
    slug: "airpods-pro-3-16",
    aliases: ["airpods-pro-3-mock"],
    price: 16193,
    isNew: true,
    isFeatured: true,
    brandName: "Apple",
    imageUrl:
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=900&h=1100&q=80",
    hoverImageUrl:
      "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&h=1100&q=80",
  },
  {
    id: "mock-ps5",
    name: "PlayStation 5 Disc",
    slug: "sony-ps5-disc-14",
    aliases: ["sony-ps5-disc-mock"],
    price: 24990,
    isFeatured: true,
    brandName: "Sony",
    imageUrl:
      "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&h=1100&q=80",
    hoverImageUrl:
      "https://images.unsplash.com/photo-1622297845775-5ff3fef71da6?auto=format&fit=crop&w=900&h=1100&q=80",
  },
  {
    id: "mock-dyson-v15",
    name: "Dyson V15s Detect",
    slug: "dyson-v15s-22",
    aliases: ["dyson-v15s-mock"],
    price: 44163,
    isCampaign: true,
    isFeatured: true,
    brandName: "Dyson",
    imageUrl:
      "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=900&h=1100&q=80",
    hoverImageUrl:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&h=1100&q=80",
  },
  {
    id: "mock-arctis",
    name: "SteelSeries Arctis Pro",
    slug: "steelseries-arctis-pro-21",
    aliases: ["steelseries-arctis-pro-mock"],
    price: 12022,
    isFeatured: true,
    brandName: "SteelSeries",
    imageUrl:
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&h=1100&q=80",
    hoverImageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&h=1100&q=80",
  },
];

export const MOCK_CATEGORIES = [
  {
    id: "mock-cat-pc",
    title: "Bilgisayar",
    subtitle: "Notebook, AIO, tablet",
    linkUrl: "/kategori/bilgisayar",
    imageUrl:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&h=1200&q=80",
  },
  {
    id: "mock-cat-phone",
    title: "Telefon",
    subtitle: "Flagship ve orta segment",
    linkUrl: "/kategori/telefon",
    imageUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&h=900&q=80",
  },
  {
    id: "mock-cat-gaming",
    title: "Gaming",
    subtitle: "Konsol, kulaklık, ekipman",
    linkUrl: "/urunler?q=gaming",
    imageUrl:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&h=900&q=80",
  },
  {
    id: "mock-cat-home",
    title: "Ev Bakım",
    subtitle: "Dyson ve akıllı cihazlar",
    linkUrl: "/kategori/ev-bakim",
    imageUrl:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&h=900&q=80",
  },
];

export const MOCK_BRANDS = [
  "Apple",
  "Samsung",
  "ASUS",
  "MSI",
  "Logitech",
  "Dyson",
  "Sony",
  "Xiaomi",
  "HP",
  "Dell",
];

export const MOCK_CAMPAIGN = {
  title: "Yaz Teknoloji Günleri",
  subtitle: "Seçili ürünlerde yüzde 20'ye varan indirim. Stoklar tükenince biter.",
  linkUrl: "/kampanya/yaz-teknoloji",
  buttonLabel: "Kampanyayı aç",
  imageUrl:
    "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=1400&h=900&q=80",
};

export function isMockProductId(id: string) {
  return id.startsWith("mock-");
}

export function findMockProduct(slug: string) {
  return (
    MOCK_PRODUCTS.find(
      (product) => product.slug === slug || product.aliases?.includes(slug),
    ) ?? null
  );
}

export function mockProductsForCatalog(opts?: {
  search?: string;
  brandSlug?: string;
  categorySlug?: string;
}) {
  if (opts?.categorySlug) return [];

  const search = opts?.search?.trim().toLocaleLowerCase("tr-TR");
  const brand = opts?.brandSlug?.trim().toLocaleLowerCase("tr-TR");

  return MOCK_PRODUCTS.filter((product) => {
    if (brand) {
      const productBrand = (product.brandName ?? "")
        .toLocaleLowerCase("tr-TR")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      if (productBrand !== brand) return false;
    }
    if (!search) return true;
    const haystack = `${product.name} ${product.brandName ?? ""}`.toLocaleLowerCase(
      "tr-TR",
    );
    return haystack.includes(search);
  });
}

export function mergeCatalogProducts(
  databaseProducts: ProductCardData[],
  mockProducts: ProductCardData[],
) {
  const seen = new Set(databaseProducts.map((product) => product.id));
  return [
    ...mockProducts.filter((product) => !seen.has(product.id)),
    ...databaseProducts,
  ];
}
