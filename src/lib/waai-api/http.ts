import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(
    { ok: true as const, data },
    { status: init?.status ?? 200 },
  );
}

/** Waai / website-api.client expects `products`, `items`, or an array `data`. */
export function jsonWaaiProductList<T extends Record<string, unknown>>(
  items: T[],
  meta?: {
    status?: number;
    query?: string;
    pagination?: Record<string, unknown>;
  },
) {
  return NextResponse.json(
    {
      ok: true as const,
      success: true as const,
      products: items,
      items,
      data: items,
      count: items.length,
      ...(meta?.query ? { query: meta.query } : {}),
      ...(meta?.pagination ? { pagination: meta.pagination } : {}),
    },
    { status: meta?.status ?? 200 },
  );
}

/** Single product — nested `data` + flat aliases Waai often reads. */
export function jsonWaaiProduct<T extends Record<string, unknown>>(product: T) {
  const stock =
    typeof product.stock === "number"
      ? product.stock
      : typeof product.quantity === "number"
        ? product.quantity
        : 0;
  return NextResponse.json({
    ok: true as const,
    success: true as const,
    data: product,
    product,
    products: [product],
    items: [product],
    name: product.name ?? product.title ?? null,
    title: product.title ?? product.name ?? null,
    sku: product.sku ?? null,
    price: product.price ?? null,
    stock,
    quantity: stock,
    available: stock,
    inStock: Boolean(product.inStock ?? stock > 0),
    currency: product.currency ?? null,
    url: product.url ?? null,
  });
}

/** Stock lookup — flat fields Waai prompts often expect. */
export function jsonWaaiStock<T extends Record<string, unknown>>(stock: T) {
  const qty =
    typeof stock.stock === "number"
      ? stock.stock
      : typeof stock.quantity === "number"
        ? stock.quantity
        : 0;
  const inStock = Boolean(stock.inStock ?? qty > 0);
  const name =
    (typeof stock.productName === "string" && stock.productName) ||
    (typeof stock.name === "string" && stock.name) ||
    null;
  return NextResponse.json({
    ok: true as const,
    success: true as const,
    data: stock,
    stock: qty,
    quantity: qty,
    available: qty,
    inStock,
    sku: stock.sku ?? null,
    productSku: stock.productSku ?? stock.sku ?? null,
    name,
    productName: name,
    price: stock.price ?? null,
    currency: stock.currency ?? null,
    message:
      typeof stock.message === "string"
        ? stock.message
        : inStock
          ? `${name ?? "Ürün"} stokta: ${qty} adet.`
          : `${name ?? "Ürün"} şu an stokta yok.`,
    variants: stock.variants ?? undefined,
  });
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(
    {
      ok: false as const,
      success: false as const,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    },
    { status },
  );
}

export function parsePagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20),
  );
  return { page, limit, offset: (page - 1) * limit };
}

/** Waai sometimes sends q / query / search / name. */
export function parseSearchQuery(url: URL) {
  return (
    url.searchParams.get("q")?.trim() ||
    url.searchParams.get("query")?.trim() ||
    url.searchParams.get("search")?.trim() ||
    url.searchParams.get("name")?.trim() ||
    url.searchParams.get("sku")?.trim() ||
    ""
  );
}
