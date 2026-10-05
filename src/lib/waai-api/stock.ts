import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productVariants } from "@/lib/db/schema";
import { resolveProduct } from "@/lib/waai-api/products";

/**
 * Stock lookup uses the same resolveProduct path as product detail,
 * so short brand+model / model-code identifiers resolve consistently.
 */
export async function getStockBySku(sku: string) {
  const resolved = await resolveProduct(sku);
  const product = resolved.product;
  if (!product) return null;

  const matchedVariantSku =
    typeof product.matchedVariantSku === "string"
      ? product.matchedVariantSku
      : null;

  if (matchedVariantSku) {
    const variant = await db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.sku, matchedVariantSku),
        eq(productVariants.isActive, true),
      ),
    });
    if (variant) {
      const stock = variant.stock;
      return {
        sku: variant.sku,
        productSku: product.sku,
        productId: product.id,
        productName: product.name,
        name: product.name,
        variantId: variant.id,
        variantName: variant.name,
        stock,
        quantity: stock,
        available: stock,
        inStock: stock > 0,
        lowStock: Boolean(product.lowStock) && stock > 0,
        minStock: undefined as number | undefined,
        options: variant.options ?? {},
        price:
          variant.price != null ? Number(variant.price) : Number(product.price),
        currency: product.currency ?? "TRY",
        message:
          stock > 0
            ? `${product.name} (${variant.name}) stokta: ${stock} adet.`
            : `${product.name} (${variant.name}) şu an stokta yok.`,
      };
    }
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const stock =
    typeof product.stock === "number"
      ? product.stock
      : typeof product.quantity === "number"
        ? product.quantity
        : 0;

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
    lowStock: Boolean(product.lowStock),
    minStock: undefined as number | undefined,
    price: Number(product.price),
    currency: product.currency ?? "TRY",
    variants: variants.map((v) => ({
      sku: v.sku,
      name: v.name,
      stock: v.stock,
      quantity: v.stock,
      inStock: v.stock > 0,
      options: v.options ?? {},
      price: Number(v.price),
    })),
    message:
      stock > 0
        ? `${product.name} stokta: ${stock} adet.`
        : `${product.name} şu an stokta yok.`,
  };
}
