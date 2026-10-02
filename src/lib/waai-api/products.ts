import { and, asc, desc, eq, gt, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  brands,
  categories,
  productImages,
  productVariants,
  products,
} from "@/lib/db/schema";
import { serializeProduct } from "@/lib/waai-api/serialize";

type ProductImageRow = {
  url: string;
  alt: string | null;
  isPrimary: boolean;
};

async function attachImages(productIds: string[]) {
  const map = new Map<string, ProductImageRow[]>();
  if (productIds.length === 0) return map;

  const images = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      alt: productImages.alt,
      isPrimary: productImages.isPrimary,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.sortOrder));

  for (const img of images) {
    const list = map.get(img.productId) ?? [];
    list.push({
      url: img.url,
      alt: img.alt,
      isPrimary: img.isPrimary,
    });
    map.set(img.productId, list);
  }
  return map;
}

const productSelect = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  sku: products.sku,
  barcode: products.barcode,
  shortDescription: products.shortDescription,
  description: products.description,
  price: products.price,
  compareAtPrice: products.compareAtPrice,
  taxRate: products.taxRate,
  stock: products.stock,
  minStock: products.minStock,
  status: products.status,
  isFeatured: products.isFeatured,
  isNew: products.isNew,
  isCampaign: products.isCampaign,
  tags: products.tags,
  specs: products.specs,
  technicalSpecs: products.technicalSpecs,
  categoryId: products.categoryId,
  brandId: products.brandId,
  soldCount: products.soldCount,
  categoryName: categories.name,
  categorySlug: categories.slug,
  brandName: brands.name,
  brandSlug: brands.slug,
};

export async function listProducts(opts: {
  offset: number;
  limit: number;
  category?: string | null;
  brand?: string | null;
  inStockOnly?: boolean;
}) {
  const conditions = [eq(products.status, "active")];
  if (opts.category) {
    conditions.push(
      or(
        eq(categories.slug, opts.category),
        eq(categories.id, opts.category),
      )!,
    );
  }
  if (opts.brand) {
    conditions.push(
      or(eq(brands.slug, opts.brand), eq(brands.id, opts.brand))!,
    );
  }
  if (opts.inStockOnly) {
    conditions.push(gt(products.stock, 0));
  }

  const where = and(...conditions);
  const [rows, countRows] = await Promise.all([
    db
      .select(productSelect)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(where)
      .orderBy(desc(products.isFeatured), desc(products.updatedAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(where),
  ]);

  const imageMap = await attachImages(rows.map((r) => r.id));
  return {
    items: rows.map((row) =>
      serializeProduct({ ...row, images: imageMap.get(row.id) ?? [] }),
    ),
    total: countRows[0]?.count ?? rows.length,
  };
}

export async function searchProducts(opts: {
  q: string;
  offset: number;
  limit: number;
}) {
  const q = opts.q.trim();
  if (!q) {
    return { items: [] as ReturnType<typeof serializeProduct>[], total: 0 };
  }

  const pattern = `%${q}%`;
  const where = and(
    eq(products.status, "active"),
    or(
      ilike(products.name, pattern),
      ilike(products.sku, pattern),
      ilike(products.barcode, pattern),
      ilike(products.shortDescription, pattern),
      ilike(products.seoTitle, pattern),
      ilike(brands.name, pattern),
      ilike(categories.name, pattern),
    ),
  );

  const [rows, countRows] = await Promise.all([
    db
      .select(productSelect)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(where)
      .orderBy(desc(products.isFeatured), desc(products.soldCount))
      .limit(opts.limit)
      .offset(opts.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(where),
  ]);

  const imageMap = await attachImages(rows.map((r) => r.id));
  return {
    items: rows.map((row) =>
      serializeProduct({ ...row, images: imageMap.get(row.id) ?? [] }),
    ),
    total: countRows[0]?.count ?? rows.length,
    query: q,
  };
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function getProductBySku(sku: string) {
  const normalized = sku.trim();
  if (!normalized) return null;

  const identityMatchers = [
    eq(products.sku, normalized),
    eq(products.slug, normalized),
    eq(products.barcode, normalized),
  ];
  if (looksLikeUuid(normalized)) {
    identityMatchers.push(eq(products.id, normalized));
  }

  const row = await db
    .select(productSelect)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(eq(products.status, "active"), or(...identityMatchers)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) {
    const variant = await db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.sku, normalized),
        eq(productVariants.isActive, true),
      ),
    });
    if (!variant) return null;

    const parent = await db
      .select(productSelect)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(
        and(eq(products.id, variant.productId), eq(products.status, "active")),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);
    if (!parent) return null;

    const [imageMap, variants] = await Promise.all([
      attachImages([parent.id]),
      db.query.productVariants.findMany({
        where: eq(productVariants.productId, parent.id),
      }),
    ]);

    return serializeProduct(
      {
        ...parent,
        images: imageMap.get(parent.id) ?? [],
        variants,
      },
      { detail: true },
    );
  }

  const [imageMap, variants] = await Promise.all([
    attachImages([row.id]),
    db.query.productVariants.findMany({
      where: eq(productVariants.productId, row.id),
    }),
  ]);

  return serializeProduct(
    {
      ...row,
      images: imageMap.get(row.id) ?? [],
      variants,
    },
    { detail: true },
  );
}

export async function getRecommendations(opts: {
  sku?: string | null;
  productId?: string | null;
  limit?: number;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 24);
  let seed: {
    id: string;
    categoryId: string | null;
    brandId: string | null;
    price: string;
  } | null = null;

  if (opts.sku || opts.productId) {
    const key = (opts.sku ?? opts.productId)!.trim();
    const matchers = [eq(products.sku, key), eq(products.slug, key)];
    if (looksLikeUuid(key)) matchers.push(eq(products.id, key));

    seed = await db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        brandId: products.brandId,
        price: products.price,
      })
      .from(products)
      .where(and(eq(products.status, "active"), or(...matchers)))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  const conditions = [eq(products.status, "active"), gt(products.stock, 0)];
  if (seed) {
    conditions.push(ne(products.id, seed.id));
    if (seed.categoryId) {
      conditions.push(eq(products.categoryId, seed.categoryId));
    } else if (seed.brandId) {
      conditions.push(eq(products.brandId, seed.brandId));
    }
  } else {
    conditions.push(eq(products.isFeatured, true));
  }

  let rows = await db
    .select(productSelect)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(...conditions))
    .orderBy(
      desc(products.isCampaign),
      desc(products.soldCount),
      desc(products.isFeatured),
    )
    .limit(limit);

  // Fallback: same brand or popular products if category yield is thin.
  if (seed && rows.length < Math.min(4, limit)) {
    const fallbackConditions = [
      eq(products.status, "active"),
      gt(products.stock, 0),
      ne(products.id, seed.id),
    ];
    if (seed.brandId) {
      fallbackConditions.push(eq(products.brandId, seed.brandId));
    }

    const fallback = await db
      .select(productSelect)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(and(...fallbackConditions))
      .orderBy(desc(products.soldCount), desc(products.isFeatured))
      .limit(limit);

    const seen = new Set(rows.map((r) => r.id));
    for (const row of fallback) {
      if (seen.has(row.id)) continue;
      rows.push(row);
      if (rows.length >= limit) break;
    }
  }

  if (rows.length === 0) {
    rows = await db
      .select(productSelect)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(and(eq(products.status, "active"), gt(products.stock, 0)))
      .orderBy(desc(products.isFeatured), desc(products.soldCount))
      .limit(limit);
  }

  const imageMap = await attachImages(rows.map((r) => r.id));
  return {
    seedSku: opts.sku ?? null,
    items: rows.map((row) =>
      serializeProduct({ ...row, images: imageMap.get(row.id) ?? [] }),
    ),
  };
}
