import { asc, eq } from "drizzle-orm";
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
import { loadProductCards } from "@/lib/storefront/products";

async function loadHomepageSections(): Promise<HomepageSection[] | null> {
  try {
    const sections = await db
      .select()
      .from(homepageSections)
      .where(eq(homepageSections.status, "published"))
      .orderBy(asc(homepageSections.sortOrder));

    if (!sections.length) return [];

    const items = await db
      .select()
      .from(homepageSectionItems)
      .orderBy(asc(homepageSectionItems.sortOrder));

    const productIds = [
      ...new Set(
        items
          .map((i) => i.productId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    let productMap = new Map<string, ProductCardData>();
    if (productIds.length) {
      const rows = await db
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
        .where(eq(products.status, "active"));

      const images = await db.select().from(productImages);
      const byProduct = new Map<string, typeof images>();
      for (const img of images) {
        const list = byProduct.get(img.productId) ?? [];
        list.push(img);
        byProduct.set(img.productId, list);
      }

      productMap = new Map(
        rows
          .filter((p) => productIds.includes(p.id))
          .map((p) => {
            const imgs = (byProduct.get(p.id) ?? []).sort(
              (a, b) => a.sortOrder - b.sortOrder,
            );
            const card: ProductCardData = {
              id: p.id,
              name: p.name,
              slug: p.slug,
              price: p.price,
              compareAtPrice: p.compareAtPrice,
              isNew: p.isNew,
              isCampaign: p.isCampaign,
              isFeatured: p.isFeatured,
              imageUrl: imgs[0]?.url ?? null,
              hoverImageUrl: imgs[1]?.url ?? null,
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

export default async function HomePage() {
  const [sections, featuredCards] = await Promise.all([
    loadHomepageSections(),
    loadProductCards({ featured: true, limit: 8 }),
  ]);

  const featured =
    featuredCards[0] ??
    (await loadProductCards({ limit: 1 }))[0] ??
    null;

  const grid =
    featuredCards.length >= 4
      ? featuredCards
      : await loadProductCards({ limit: 8 });

  if (sections === null || sections.length === 0) {
    return <FallbackHero featured={featured} products={grid} />;
  }

  return (
    <HomepageSections sections={sections} featuredProduct={featured} />
  );
}
