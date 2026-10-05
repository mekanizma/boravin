import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { productVariants, products } from "@/lib/db/schema";
import {
  pickBestProductMatch,
  significantTokens,
} from "@/lib/waai-api/product-match";

async function findProductByName(query: string) {
  const normalized = query.trim();
  if (!normalized) return null;

  const exact = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, "active"),
        sql`lower(${products.name}) = lower(${normalized})`,
      ),
    )
    .orderBy(desc(products.soldCount))
    .limit(1);
  if (exact[0]) return exact[0];

  const pattern = `%${normalized}%`;
  const tokens = significantTokens(normalized);

  const fuzzy = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, "active"),
        or(
          ilike(products.name, pattern),
          ilike(products.sku, pattern),
          ilike(products.slug, pattern),
          ilike(products.shortDescription, pattern),
          ...(tokens.length > 0
            ? tokens.map((token) => ilike(products.name, `%${token}%`))
            : []),
        ),
      ),
    )
    .orderBy(desc(products.soldCount), desc(products.isFeatured))
    .limit(12);

  return pickBestProductMatch(normalized, fuzzy);
}

export async function getStockBySku(sku: string) {
  const normalized = sku.trim();
  if (!normalized) return null;

  const variant = await db.query.productVariants.findFirst({
    where: and(
      or(
        eq(productVariants.sku, normalized),
        ilike(productVariants.sku, normalized),
      ),
      eq(productVariants.isActive, true),
    ),
  });

  if (variant) {
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.id, variant.productId),
        eq(products.status, "active"),
      ),
    });
    if (!product) return null;
    return {
      sku: variant.sku,
      productSku: product.sku,
      productId: product.id,
      productName: product.name,
      name: product.name,
      variantId: variant.id,
      variantName: variant.name,
      stock: variant.stock,
      quantity: variant.stock,
      available: variant.stock,
      inStock: variant.stock > 0,
      lowStock: variant.stock > 0 && variant.stock <= product.minStock,
      minStock: product.minStock,
      options: variant.options ?? {},
      price:
        variant.price != null ? Number(variant.price) : Number(product.price),
      currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "TRY",
      message:
        variant.stock > 0
          ? `${product.name} (${variant.name}) stokta: ${variant.stock} adet.`
          : `${product.name} (${variant.name}) şu an stokta yok.`,
    };
  }

  let product =
    (await db.query.products.findFirst({
      where: and(
        eq(products.status, "active"),
        or(
          eq(products.sku, normalized),
          eq(products.barcode, normalized),
          eq(products.slug, normalized),
          ilike(products.sku, normalized),
          ilike(products.slug, normalized),
          ilike(products.barcode, normalized),
        ),
      ),
    })) ?? null;

  if (!product) {
    product = (await findProductByName(normalized)) ?? null;
  }
  if (!product) return null;

  const variants = await db.query.productVariants.findMany({
    where: and(
      eq(productVariants.productId, product.id),
      eq(productVariants.isActive, true),
    ),
  });

  const variantStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const stock = Math.max(product.stock, variantStock);

  return {
    sku: product.sku,
    productSku: product.sku,
    productId: product.id,
    productName: product.name,
    name: product.name,
    variantId: null as string | null,
    variantName: null as string | null,
    stock,
    quantity: stock,
    available: stock,
    inStock: stock > 0,
    lowStock: stock > 0 && stock <= product.minStock,
    minStock: product.minStock,
    price: Number(product.price),
    currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "TRY",
    variants: variants.map((v) => ({
      sku: v.sku,
      name: v.name,
      stock: v.stock,
      quantity: v.stock,
      inStock: v.stock > 0,
      options: v.options ?? {},
      price: v.price != null ? Number(v.price) : Number(product.price),
    })),
    message:
      stock > 0
        ? `${product.name} stokta: ${stock} adet.`
        : `${product.name} şu an stokta yok.`,
  };
}
