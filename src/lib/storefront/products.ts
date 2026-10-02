import { asc, eq, ilike, and, sql, gte, lte, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { brands, categories, productImages, products } from "@/lib/db/schema";
import type { ProductCardData } from "@/components/storefront/product-card";
import { publicImageUrl } from "@/lib/media/url";
import {
  catalogSortOrderBy,
  parseCatalogSort,
  type CatalogSort,
} from "@/lib/storefront/catalog-sort";

export type LoadProductCardsOpts = {
  limit?: number;
  categoryId?: string;
  categorySlug?: string;
  brandId?: string;
  brandSlug?: string;
  search?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort | string;
};

async function loadProductCardsUncached(
  opts?: LoadProductCardsOpts,
): Promise<ProductCardData[]> {
  try {
    let categoryId = opts?.categoryId;
    let brandId = opts?.brandId;

    const lookups: Promise<void>[] = [];
    if (opts?.categorySlug) {
      lookups.push(
        db.query.categories
          .findFirst({ where: eq(categories.slug, opts.categorySlug) })
          .then((cat) => {
            categoryId = cat?.id;
          }),
      );
    }
    if (opts?.brandSlug) {
      lookups.push(
        db.query.brands
          .findFirst({ where: eq(brands.slug, opts.brandSlug) })
          .then((brand) => {
            brandId = brand?.id;
          }),
      );
    }
    if (lookups.length) await Promise.all(lookups);

    const conditions = [eq(products.status, "active")];
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (brandId) conditions.push(eq(products.brandId, brandId));
    if (opts?.featured) conditions.push(eq(products.isFeatured, true));
    if (opts?.search) {
      conditions.push(ilike(products.name, `%${opts.search}%`));
    }
    if (opts?.minPrice != null) {
      conditions.push(gte(products.price, String(opts.minPrice)));
    }
    if (opts?.maxPrice != null) {
      conditions.push(lte(products.price, String(opts.maxPrice)));
    }

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
        brandName: brands.name,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(and(...conditions))
      .orderBy(...catalogSortOrderBy(parseCatalogSort(opts?.sort)))
      .limit(opts?.limit ?? 48);

    if (!rows.length) return [];

    const productIds = rows.map((row) => row.id);
    const images = await db
      .select({
        productId: productImages.productId,
        url: productImages.url,
        sortOrder: productImages.sortOrder,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.sortOrder));

    const byProduct = new Map<string, typeof images>();
    for (const img of images) {
      const list = byProduct.get(img.productId) ?? [];
      list.push(img);
      byProduct.set(img.productId, list);
    }

    return rows.map((p) => {
      const imgs = byProduct.get(p.id) ?? [];
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        isNew: p.isNew,
        isCampaign: p.isCampaign,
        isFeatured: p.isFeatured,
        brandName: p.brandName,
        imageUrl: publicImageUrl(imgs[0]?.url ?? null),
        hoverImageUrl: publicImageUrl(imgs[1]?.url ?? null),
      };
    });
  } catch {
    return [];
  }
}

function cacheKeyForProductCards(opts?: LoadProductCardsOpts) {
  return JSON.stringify({
    limit: opts?.limit ?? 48,
    categoryId: opts?.categoryId ?? null,
    categorySlug: opts?.categorySlug ?? null,
    brandId: opts?.brandId ?? null,
    brandSlug: opts?.brandSlug ?? null,
    search: opts?.search ?? null,
    featured: opts?.featured ?? false,
    minPrice: opts?.minPrice ?? null,
    maxPrice: opts?.maxPrice ?? null,
    sort: opts?.sort ?? null,
  });
}

const loadProductCardsCached = unstable_cache(
  async (key: string) =>
    loadProductCardsUncached(JSON.parse(key) as LoadProductCardsOpts),
  ["product-cards"],
  { revalidate: 120, tags: ["products", "product-cards"] },
);

export async function loadProductCards(
  opts?: LoadProductCardsOpts,
): Promise<ProductCardData[]> {
  return loadProductCardsUncached(opts);
}

/** Cached catalog cards for storefront shells (homepage / listings warm path). */
export function loadCachedProductCards(opts?: LoadProductCardsOpts) {
  return loadProductCardsCached(cacheKeyForProductCards(opts));
}

export async function countActiveProducts() {
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.status, "active"));
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}
