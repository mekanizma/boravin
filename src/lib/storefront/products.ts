import { asc, desc, eq, ilike, and, sql, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, categories, productImages, products } from "@/lib/db/schema";
import type { ProductCardData } from "@/components/storefront/product-card";
import { publicImageUrl } from "@/lib/media/url";

export async function loadProductCards(opts?: {
  limit?: number;
  categoryId?: string;
  categorySlug?: string;
  brandId?: string;
  brandSlug?: string;
  search?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
}): Promise<ProductCardData[]> {
  try {
    let categoryId = opts?.categoryId;
    let brandId = opts?.brandId;

    if (opts?.categorySlug) {
      const cat = await db.query.categories.findFirst({
        where: eq(categories.slug, opts.categorySlug),
      });
      categoryId = cat?.id;
    }
    if (opts?.brandSlug) {
      const brand = await db.query.brands.findFirst({
        where: eq(brands.slug, opts.brandSlug),
      });
      brandId = brand?.id;
    }

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
      .orderBy(desc(products.createdAt))
      .limit(opts?.limit ?? 48);

    if (!rows.length) return [];

    const images = await db
      .select()
      .from(productImages)
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
