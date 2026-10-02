import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { productVariants, products } from "@/lib/db/schema";

export async function getStockBySku(sku: string) {
  const normalized = sku.trim();
  if (!normalized) return null;

  const variant = await db.query.productVariants.findFirst({
    where: and(
      eq(productVariants.sku, normalized),
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
      variantId: variant.id,
      variantName: variant.name,
      stock: variant.stock,
      inStock: variant.stock > 0,
      lowStock: variant.stock > 0 && variant.stock <= product.minStock,
      minStock: product.minStock,
      options: variant.options ?? {},
      price:
        variant.price != null ? Number(variant.price) : Number(product.price),
      currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "TRY",
    };
  }

  const product = await db.query.products.findFirst({
    where: and(
      eq(products.status, "active"),
      or(
        eq(products.sku, normalized),
        eq(products.barcode, normalized),
        eq(products.slug, normalized),
      ),
    ),
  });
  if (!product) return null;

  return {
    sku: product.sku,
    productSku: product.sku,
    productId: product.id,
    productName: product.name,
    variantId: null as string | null,
    variantName: null as string | null,
    stock: product.stock,
    inStock: product.stock > 0,
    lowStock: product.stock > 0 && product.stock <= product.minStock,
    minStock: product.minStock,
    price: Number(product.price),
    currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "TRY",
  };
}
