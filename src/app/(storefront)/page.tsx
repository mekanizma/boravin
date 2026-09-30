import { asc, and, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import {
  homepageSectionItems,
  homepageSections,
  productImages,
  products,
} from "@/lib/db/schema";
import {
  FallbackHero,
  HomepageSections,
  type HomepageSection,
} from "@/components/storefront/homepage-sections";
import type { ProductCardData } from "@/components/storefront/product-card";
import { publicImageUrl } from "@/lib/media/url";
import { loadCachedProductCards } from "@/lib/storefront/products";
import { getHomepageBannerAnnouncements } from "@/lib/storefront/announcements";
import { loadPublishedCampaigns } from "@/lib/storefront/campaigns";

export const dynamic = "force-dynamic";

async function loadHomepageSectionsUncached(): Promise<HomepageSection[] | null> {
  try {
    const [sections, items] = await Promise.all([
      db
        .select()
        .from(homepageSections)
        .where(eq(homepageSections.status, "published"))
        .orderBy(asc(homepageSections.sortOrder)),
      db
        .select()
        .from(homepageSectionItems)
        .orderBy(asc(homepageSectionItems.sortOrder)),
    ]);

    if (!sections.length) return [];

    const productIds = [
      ...new Set(
        items
          .map((i) => i.productId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    let productMap = new Map<string, ProductCardData>();
    if (productIds.length) {
      const [rows, images] = await Promise.all([
        db
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            price: products.price,
            compareAtPrice: products.compareAtPrice,
            isNew: products.isNew,
            isCampaign: products.isCampaign,
            isFeatured: products.isFeatured,
          })
          .from(products)
          .where(
            and(eq(products.status, "active"), inArray(products.id, productIds)),
          ),
        db
          .select({
            productId: productImages.productId,
            url: productImages.url,
            sortOrder: productImages.sortOrder,
          })
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
          .orderBy(asc(productImages.sortOrder)),
      ]);

      const byProduct = new Map<string, typeof images>();
      for (const img of images) {
        const list = byProduct.get(img.productId) ?? [];
        list.push(img);
        byProduct.set(img.productId, list);
      }

      productMap = new Map(
        rows.map((p) => {
          const imgs = byProduct.get(p.id) ?? [];
          const card: ProductCardData = {
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            compareAtPrice: p.compareAtPrice,
            isNew: p.isNew,
            isCampaign: p.isCampaign,
            isFeatured: p.isFeatured,
            imageUrl: publicImageUrl(imgs[0]?.url ?? null),
            hoverImageUrl: publicImageUrl(imgs[1]?.url ?? null),
          };
          return [p.id, card] as const;
        }),
      );
    }

    return sections.map((section) => {
      const sectionItems = items
        .filter((i) => i.sectionId === section.id)
        .map((i) => ({
          id: i.id,
          title: i.title,
          subtitle: i.subtitle,
          imageUrl: i.imageUrl,
          linkUrl: i.linkUrl,
          buttonLabel: i.buttonLabel,
          meta: i.meta,
          product: i.productId ? (productMap.get(i.productId) ?? null) : null,
        }));

      return {
        id: section.id,
        type: section.type,
        title: section.title,
        subtitle: section.subtitle,
        config: section.config,
        items: sectionItems,
        products: sectionItems
          .map((i) => i.product)
          .filter(Boolean) as ProductCardData[],
      };
    });
  } catch {
    return null;
  }
}

const loadHomepageSections = unstable_cache(
  loadHomepageSectionsUncached,
  ["homepage-sections-v3"],
  { revalidate: 60, tags: ["homepage", "products"] },
);

export default async function HomePage() {
  const [sections, promoBanners, promoCampaigns] = await Promise.all([
    loadHomepageSections(),
    getHomepageBannerAnnouncements(2),
    loadPublishedCampaigns(2),
  ]);

  if (sections === null || sections.length === 0) {
    const featuredCards = await loadCachedProductCards({
      featured: true,
      limit: 8,
    });
    const featured =
      featuredCards[0] ??
      (await loadCachedProductCards({ limit: 1 }))[0] ??
      null;
    const grid =
      featuredCards.length >= 4
        ? featuredCards
        : await loadCachedProductCards({ limit: 8 });

    return (
      <FallbackHero
        featured={featured}
        products={grid}
        promoBanners={promoBanners}
        promoCampaigns={promoCampaigns}
      />
    );
  }

  return (
    <HomepageSections
      sections={sections}
      promoBanners={promoBanners}
      promoCampaigns={promoCampaigns}
    />
  );
}
