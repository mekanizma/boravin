import { and, asc, desc, eq, gt, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attributeValues,
  attributes,
  brands,
  categories,
  productAttributeValues,
  productImages,
  productVariants,
  products,
} from "@/lib/db/schema";
import {
  serializeProduct,
  type WaaiProductAttribute,
} from "@/lib/waai-api/serialize";
import {
  clampSearchQuery,
  extractModelSignals,
  extractProductSearchQuery,
  normalizeProductQuery,
  rankProductMatches,
  sanitizeLikeToken,
  significantTokens,
} from "@/lib/waai-api/product-match";

/** Postgres fold for Turkish letters so "monitor" matches "Monitörü". */
function sqlFold(column: unknown) {
  return sql`translate(lower(coalesce(${column}, '')), 'ığüşöç', 'igusoc')`;
}

type ProductImageRow = {
  url: string;
  alt: string | null;
  isPrimary: boolean;
};

type ProductVariantRow = {
  id: string;
  name: string;
  sku: string;
  price: string | null;
  stock: number;
  options: Record<string, string> | null;
  isActive: boolean;
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

async function attachVariants(productIds: string[]) {
  const map = new Map<string, ProductVariantRow[]>();
  if (productIds.length === 0) return map;

  const rows = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      name: productVariants.name,
      sku: productVariants.sku,
      price: productVariants.price,
      stock: productVariants.stock,
      options: productVariants.options,
      isActive: productVariants.isActive,
    })
    .from(productVariants)
    .where(inArray(productVariants.productId, productIds))
    .orderBy(asc(productVariants.name));

  for (const row of rows) {
    const list = map.get(row.productId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      sku: row.sku,
      price: row.price,
      stock: row.stock,
      options: row.options,
      isActive: row.isActive,
    });
    map.set(row.productId, list);
  }
  return map;
}

async function attachAttributes(productIds: string[]) {
  const map = new Map<string, WaaiProductAttribute[]>();
  if (productIds.length === 0) return map;

  const rows = await db
    .select({
      productId: productAttributeValues.productId,
      code: attributes.code,
      name: attributes.name,
      unit: attributes.unit,
      valueText: productAttributeValues.valueText,
      value: attributeValues.value,
    })
    .from(productAttributeValues)
    .innerJoin(
      attributes,
      eq(productAttributeValues.attributeId, attributes.id),
    )
    .leftJoin(
      attributeValues,
      eq(productAttributeValues.attributeValueId, attributeValues.id),
    )
    .where(inArray(productAttributeValues.productId, productIds))
    .orderBy(asc(attributes.name));

  for (const row of rows) {
    const value = (row.valueText ?? row.value ?? "").trim();
    if (!value) continue;
    const list = map.get(row.productId) ?? [];
    list.push({
      code: row.code,
      name: row.name,
      unit: row.unit,
      value,
    });
    map.set(row.productId, list);
  }
  return map;
}

async function enrichProducts<T extends { id: string }>(
  rows: T[],
  opts?: { detail?: boolean },
) {
  const ids = rows.map((r) => r.id);
  const [imageMap, variantMap, attributeMap] = await Promise.all([
    attachImages(ids),
    attachVariants(ids),
    attachAttributes(ids),
  ]);

  return rows.map((row) =>
    serializeProduct(
      {
        ...(row as Record<string, unknown>),
        id: row.id,
        images: imageMap.get(row.id) ?? [],
        variants: variantMap.get(row.id) ?? [],
        attributes: attributeMap.get(row.id) ?? [],
      } as Parameters<typeof serializeProduct>[0],
      opts,
    ),
  );
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

  const items = await enrichProducts(rows);
  return {
    items,
    total: countRows[0]?.count ?? rows.length,
  };
}

function foldedLike(column: unknown, token: string) {
  const safe = sanitizeLikeToken(token);
  if (!safe) return sql`false`;
  return sql`${sqlFold(column)} like ${`%${safe}%`}`;
}

function foldedEquals(column: unknown, token: string) {
  const safe = sanitizeLikeToken(token);
  if (!safe) return sql`false`;
  return sql`${sqlFold(column)} = ${safe}`;
}

/**
 * Candidate filter for product search.
 * When the query contains a model code, do NOT OR-match bare brand tokens
 * (that flooded the candidate window and dropped long-tail SKUs).
 */
function productSearchWhere(cleaned: string, tokens: string[]) {
  const q = sanitizeLikeToken(cleaned);
  const safeTokens = tokens.map(sanitizeLikeToken).filter(Boolean);
  const modelSignals = extractModelSignals(safeTokens);
  const modelTokens = modelSignals.map((s) => s.joined);

  const identityExact = or(
    foldedEquals(products.sku, q),
    foldedEquals(products.slug, q),
    foldedEquals(products.barcode, q),
    foldedEquals(products.name, q),
  );

  const fullSubstring = or(
    foldedLike(products.name, q),
    foldedLike(products.sku, q),
    foldedLike(products.slug, q),
    foldedLike(products.barcode, q),
  );

  const variantMatch = (patternToken: string) => {
    const safe = sanitizeLikeToken(patternToken);
    if (!safe) return sql`false`;
    const like = `%${safe}%`;
    return sql`exists (
      select 1 from product_variants v
      where v.product_id = ${products.id}
        and v.is_active = true
        and (
          translate(lower(coalesce(v.sku, '')), 'ığüşöç', 'igusoc') like ${like}
          or translate(lower(coalesce(v.name, '')), 'ığüşöç', 'igusoc') like ${like}
        )
    )`;
  };

  const modelMatchers =
    modelTokens.length > 0
      ? or(
          ...modelTokens.flatMap((token) => [
            foldedLike(products.name, token),
            foldedLike(products.sku, token),
            foldedLike(products.slug, token),
            variantMatch(token),
          ]),
        )
      : undefined;

  const allTokensInName =
    safeTokens.length >= 2
      ? and(...safeTokens.map((token) => foldedLike(products.name, token)))
      : undefined;

  // Model-code queries: only products that carry the model (or exact/full hit).
  if (modelTokens.length > 0) {
    return and(
      eq(products.status, "active"),
      or(identityExact, fullSubstring, modelMatchers),
    );
  }

  // Multi-token brand+words: require all tokens in name, or identity/full/brand.
  if (safeTokens.length >= 2) {
    return and(
      eq(products.status, "active"),
      or(
        identityExact,
        fullSubstring,
        allTokensInName,
        and(
          foldedLike(brands.name, safeTokens[0]!),
          ...safeTokens.slice(1).map((token) => foldedLike(products.name, token)),
        ),
        variantMatch(q),
      ),
    );
  }

  // Single-token / broad fallback
  const pattern = q;
  return and(
    eq(products.status, "active"),
    or(
      identityExact,
      fullSubstring,
      foldedLike(products.shortDescription, pattern),
      foldedLike(products.description, pattern),
      foldedLike(products.seoTitle, pattern),
      foldedLike(brands.name, pattern),
      foldedLike(categories.name, pattern),
      variantMatch(pattern),
      ...(safeTokens.length === 1
        ? [foldedLike(products.name, safeTokens[0]!)]
        : []),
    ),
  );
}

/** Cheap SQL pre-rank so the candidate window keeps model hits first. */
function productSearchRelevanceSql(cleaned: string, tokens: string[]) {
  const q = sanitizeLikeToken(cleaned);
  const safeTokens = tokens.map(sanitizeLikeToken).filter(Boolean);
  const modelTokens = extractModelSignals(safeTokens).map((s) => s.joined);

  const parts: ReturnType<typeof sql>[] = [
    sql`case when ${foldedEquals(products.sku, q)} then 1000 else 0 end`,
    sql`case when ${foldedEquals(products.barcode, q)} then 950 else 0 end`,
    sql`case when ${foldedEquals(products.slug, q)} then 900 else 0 end`,
    sql`case when ${foldedEquals(products.name, q)} then 850 else 0 end`,
    sql`case when ${sqlFold(products.name)} like ${`${q}%`} then 800 else 0 end`,
    sql`case when ${foldedLike(products.name, q)} then 750 else 0 end`,
  ];

  if (safeTokens.length >= 2) {
    parts.push(
      sql`case when ${and(
        ...safeTokens.map((token) => foldedLike(products.name, token)),
      )} then 700 else 0 end`,
    );
  }

  for (const token of modelTokens) {
    parts.push(
      sql`case when ${foldedLike(products.name, token)} then 300 else 0 end`,
    );
  }

  if (safeTokens[0]) {
    parts.push(
      sql`case when ${foldedLike(brands.name, safeTokens[0])} then 150 else 0 end`,
    );
  }

  return sql`(${sql.join(parts, sql` + `)})`;
}

export async function searchProducts(opts: {
  q: string;
  offset: number;
  limit: number;
  inStockOnly?: boolean;
}) {
  const raw = clampSearchQuery(opts.q);
  if (!raw) {
    return { items: [] as ReturnType<typeof serializeProduct>[], total: 0 };
  }

  // "samsung g95nc özellikleri neler" → "samsung g95nc"
  const q = extractProductSearchQuery(raw) || normalizeProductQuery(raw) || raw;
  const tokens = significantTokens(q);
  const whereParts = [productSearchWhere(q, tokens)];
  if (opts.inStockOnly) {
    whereParts.push(gt(products.stock, 0));
  }
  const where = and(...whereParts);
  const relevance = productSearchRelevanceSql(q, tokens);

  // Pre-rank in SQL so long-tail model matches are not trimmed by soldCount.
  const candidateLimit = Math.min(120, Math.max(opts.limit + opts.offset, 40));

  const rows = await db
    .select(productSelect)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(where)
    .orderBy(
      desc(relevance),
      desc(products.stock),
      asc(products.name),
    )
    .limit(candidateLimit);

  const ranked = rankProductMatches(raw, rows, { minScore: 40 });
  const total = ranked.length;
  const page = ranked.slice(opts.offset, opts.offset + opts.limit);
  const items = await enrichProducts(page);

  if (process.env.NODE_ENV === "development") {
    console.info("[waai:product-search]", {
      originalQuery: raw,
      normalizedQuery: q,
      tokenCount: tokens.length,
      resultCount: total,
    });
  }

  return {
    items,
    total,
    query: q,
  };
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Detail lookup — exact identity only (sku / variant sku / barcode / slug / name).
 * Partial / fuzzy name search belongs on GET /products/search?q=...
 */
export async function getProductBySku(sku: string) {
  const raw = clampSearchQuery(sku);
  if (!raw) return null;

  const identityKeys = Array.from(
    new Set([raw, normalizeProductQuery(raw)].filter(Boolean)),
  );

  const identityMatchers = identityKeys.flatMap((key) => [
    eq(products.sku, key),
    eq(products.slug, key),
    eq(products.barcode, key),
    // Case-insensitive exact (no wildcards)
    ilike(products.sku, key),
    ilike(products.slug, key),
    ilike(products.barcode, key),
    ilike(products.name, key),
  ]);
  for (const key of identityKeys) {
    if (looksLikeUuid(key)) identityMatchers.push(eq(products.id, key));
  }

  const row = await db
    .select(productSelect)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(eq(products.status, "active"), or(...identityMatchers)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (row) {
    const [enriched] = await enrichProducts([row], { detail: true });
    return enriched ?? null;
  }

  const variant = await db.query.productVariants.findFirst({
    where: and(
      or(
        ...identityKeys.flatMap((key) => [
          eq(productVariants.sku, key),
          ilike(productVariants.sku, key),
        ]),
      ),
      eq(productVariants.isActive, true),
    ),
  });
  if (variant) {
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

    const [enriched] = await enrichProducts([parent], { detail: true });
    if (!enriched) return null;
    return {
      ...enriched,
      matchedVariantSku: variant.sku,
      matchedVariantName: variant.name,
      matchedVariantStock: variant.stock,
    };
  }

  // Safe normalized exact name match only (not substring / fuzzy).
  const normalized = normalizeProductQuery(raw);
  if (!normalized) return null;

  const exactName = await db
    .select(productSelect)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(
      and(
        eq(products.status, "active"),
        foldedEquals(products.name, normalized),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!exactName) return null;
  const [enriched] = await enrichProducts([exactName], { detail: true });
  return enriched ?? null;
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
    const matchers = [
      eq(products.sku, key),
      eq(products.slug, key),
      ilike(products.sku, key),
      ilike(products.slug, key),
    ];
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

    // Name / fuzzy fallback for WhatsApp ("iPhone 16 Pro" etc.)
    if (!seed) {
      const resolved = await getProductBySku(key);
      if (resolved?.id) {
        seed = await db
          .select({
            id: products.id,
            categoryId: products.categoryId,
            brandId: products.brandId,
            price: products.price,
          })
          .from(products)
          .where(eq(products.id, resolved.id))
          .limit(1)
          .then((rows) => rows[0] ?? null);
      }
    }
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

  const items = await enrichProducts(rows);
  return {
    seedSku: opts.sku ?? null,
    items,
  };
}
