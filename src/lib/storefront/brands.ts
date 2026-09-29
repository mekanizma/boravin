export type BrandLogoItem = {
  name: string;
  slug: string;
  href: string;
  logoSrc: string;
};

const BRANDS: BrandLogoItem[] = [
  { name: "Apple", slug: "apple", href: "/marka/apple", logoSrc: "/brands/apple.svg" },
  { name: "Samsung", slug: "samsung", href: "/marka/samsung", logoSrc: "/brands/samsung.svg" },
  { name: "ASUS", slug: "asus", href: "/marka/asus", logoSrc: "/brands/asus.svg" },
  { name: "MSI", slug: "msi", href: "/marka/msi", logoSrc: "/brands/msi.svg" },
  { name: "Logitech", slug: "logitech", href: "/marka/logitech", logoSrc: "/brands/logitech.svg" },
  { name: "Dyson", slug: "dyson", href: "/marka/dyson", logoSrc: "/brands/dyson.svg" },
  { name: "Sony", slug: "sony", href: "/marka/sony", logoSrc: "/brands/sony.svg" },
  { name: "Xiaomi", slug: "xiaomi", href: "/marka/xiaomi", logoSrc: "/brands/xiaomi.svg" },
  { name: "HP", slug: "hp", href: "/marka/hp", logoSrc: "/brands/hp.svg" },
  { name: "Dell", slug: "dell", href: "/marka/dell", logoSrc: "/brands/dell.svg" },
];

const bySlug = new Map(BRANDS.map((b) => [b.slug, b]));
const byName = new Map(BRANDS.map((b) => [b.name.toLowerCase(), b]));

export function storefrontBrands(): BrandLogoItem[] {
  return BRANDS;
}

export function resolveBrandLogo(input: {
  title?: string | null;
  href?: string | null;
  imageUrl?: string | null;
}): { logoSrc: string | null; name: string } {
  const name = (input.title ?? "").trim();
  if (input.imageUrl) {
    return { logoSrc: input.imageUrl, name: name || "Marka" };
  }
  const fromName = byName.get(name.toLowerCase());
  if (fromName) return { logoSrc: fromName.logoSrc, name: fromName.name };

  const slug = (input.href ?? "")
    .split("/")
    .filter(Boolean)
    .pop()
    ?.toLowerCase();
  if (slug && bySlug.has(slug)) {
    const brand = bySlug.get(slug)!;
    return { logoSrc: brand.logoSrc, name: name || brand.name };
  }

  return { logoSrc: null, name: name || "Marka" };
}
