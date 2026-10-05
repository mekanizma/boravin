import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(
    { ok: true as const, data },
    { status: init?.status ?? 200 },
  );
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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
  const query = meta?.query;
  const first = items[0];
  const firstName =
    first && typeof first.name === "string"
      ? first.name
      : first && typeof first.title === "string"
        ? first.title
        : null;
  const firstSku = first && typeof first.sku === "string" ? first.sku : null;
  const firstDescRaw =
    first && typeof first.description === "string" && first.description.trim()
      ? first.description
      : first && typeof first.features === "string" && first.features.trim()
        ? first.features
        : null;
  const firstFeatures = firstDescRaw ? stripHtml(firstDescRaw).slice(0, 500) : null;

  let message: string;
  if (items.length === 0) {
    message = query
      ? `"${query}" için ürün bulunamadı.`
      : "Ürün bulunamadı.";
  } else if (items.length === 1 && firstName) {
    // WA AI often only reads top-level `message` — embed features there.
    message = [
      `"${query ?? firstName}" için 1 ürün bulundu: ${firstName}`,
      firstSku ? `SKU: ${firstSku}.` : null,
      firstFeatures ? `Özellikler: ${firstFeatures}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  } else {
    message = query
      ? `"${query}" için ${items.length} ürün bulundu.`
      : `${items.length} ürün listelendi.`;
  }

  return NextResponse.json(
    {
      ok: true as const,
      success: true as const,
      products: items,
      items,
      data: items,
      count: items.length,
      message,
      // Flat aliases when a single strong match — WA AI shortcut readers
      ...(items.length === 1 && first
        ? {
            product: first,
            name: firstName,
            title: firstName,
            sku: firstSku,
            description: firstDescRaw,
            features: firstDescRaw,
          }
        : {}),
      ...(query ? { query } : {}),
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
  const inStock = Boolean(product.inStock ?? stock > 0);
  const name =
    (typeof product.name === "string" && product.name) ||
    (typeof product.title === "string" && product.title) ||
    null;
  const currency =
    typeof product.currency === "string" ? product.currency : "TRY";
  const price = typeof product.price === "number" ? product.price : null;
  const brand =
    product.brand && typeof product.brand === "object"
      ? ((product.brand as Record<string, unknown>).name ?? null)
      : null;
  const category =
    product.category && typeof product.category === "object"
      ? ((product.category as Record<string, unknown>).name ?? null)
      : null;
  const shortDescription =
    typeof product.shortDescription === "string"
      ? product.shortDescription
      : null;
  const description =
    typeof product.description === "string" && product.description.trim()
      ? product.description
      : null;
  const featuresHint = description
    ? description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280)
    : shortDescription;
  const message =
    typeof product.message === "string"
      ? product.message
      : name
        ? [
            `${name}${price != null ? ` · ${price} ${currency}` : ""}`,
            inStock ? `Stokta ${stock} adet.` : "Şu an stokta yok.",
            featuresHint ? `Özellikler: ${featuresHint}` : null,
          ]
            .filter(Boolean)
            .join(" ")
        : "Ürün bulundu.";

  return NextResponse.json({
    ok: true as const,
    success: true as const,
    data: product,
    product,
    products: [product],
    items: [product],
    name,
    title: product.title ?? name,
    sku: product.sku ?? null,
    price,
    stock,
    quantity: stock,
    available: stock,
    inStock,
    currency: product.currency ?? null,
    url: product.url ?? null,
    imageUrl: product.imageUrl ?? null,
    shortDescription,
    /** Admin açıklama alanı — özelliklerin ana kaynağı (Waai flat okur) */
    description,
    features: description,
    brand,
    category,
    specs: product.specs ?? undefined,
    technicalSpecs: product.technicalSpecs ?? undefined,
    attributes: product.attributes ?? undefined,
    variants: product.variants ?? undefined,
    hasVariants: product.hasVariants ?? undefined,
    matchedVariantSku: product.matchedVariantSku ?? undefined,
    message,
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

/** Order status — nested `data` + flat aliases Waai often reads. */
export function jsonWaaiOrder<T extends Record<string, unknown>>(
  order: T,
  init?: { status?: number },
) {
  const orderNumber =
    typeof order.orderNumber === "string" ? order.orderNumber : null;
  const status = typeof order.status === "string" ? order.status : null;
  const statusLabel =
    typeof order.statusLabel === "string" ? order.statusLabel : status;
  const paymentStatus =
    typeof order.paymentStatus === "string" ? order.paymentStatus : null;
  const paymentStatusLabel =
    typeof order.paymentStatusLabel === "string"
      ? order.paymentStatusLabel
      : paymentStatus;
  const shipping =
    order.shipping && typeof order.shipping === "object"
      ? (order.shipping as Record<string, unknown>)
      : null;
  const trackingNumber =
    (shipping && typeof shipping.trackingNumber === "string"
      ? shipping.trackingNumber
      : null) ||
    (typeof order.trackingNumber === "string" ? order.trackingNumber : null);
  const message =
    typeof order.message === "string"
      ? order.message
      : orderNumber && statusLabel
        ? `Sipariş ${orderNumber}: ${statusLabel}.`
        : "Sipariş bulundu.";

  return NextResponse.json(
    {
      ok: true as const,
      success: true as const,
      data: order,
      order,
      orders: [order],
      items: [order],
      orderNumber,
      status,
      statusLabel,
      paymentStatus,
      paymentStatusLabel,
      trackingNumber,
      message,
    },
    { status: init?.status ?? 200 },
  );
}

/** Shipping / order-status lookup — flat fields for Waai prompts. */
export function jsonWaaiShipping<T extends Record<string, unknown>>(
  shipping: T,
) {
  const orderNumber =
    typeof shipping.orderNumber === "string" ? shipping.orderNumber : null;
  const orderStatus =
    typeof shipping.orderStatus === "string" ? shipping.orderStatus : null;
  const orderStatusLabel =
    typeof shipping.orderStatusLabel === "string"
      ? shipping.orderStatusLabel
      : orderStatus;
  const message =
    typeof shipping.message === "string"
      ? shipping.message
      : orderNumber && orderStatusLabel
        ? `Sipariş ${orderNumber}: ${orderStatusLabel}.`
        : "Kargo kaydı bulundu.";

  return NextResponse.json({
    ok: true as const,
    success: true as const,
    data: shipping,
    shipping,
    orderNumber,
    status: orderStatus,
    statusLabel: orderStatusLabel,
    orderStatus,
    orderStatusLabel,
    paymentStatus: shipping.paymentStatus ?? null,
    paymentStatusLabel: shipping.paymentStatusLabel ?? null,
    trackingNumber: shipping.trackingNumber ?? null,
    carrier: shipping.carrier ?? null,
    shipmentStatus: shipping.shipmentStatus ?? null,
    message,
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

/** Waai sometimes sends q / query / search / name. Max 200 chars. */
export function parseSearchQuery(url: URL) {
  const raw =
    url.searchParams.get("q")?.trim() ||
    url.searchParams.get("query")?.trim() ||
    url.searchParams.get("search")?.trim() ||
    url.searchParams.get("name")?.trim() ||
    url.searchParams.get("sku")?.trim() ||
    "";
  return raw.slice(0, 200);
}
