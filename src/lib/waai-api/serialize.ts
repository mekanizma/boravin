import { getAppUrl } from "@/lib/env/app-url";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/orders/status";

export type WaaiProductAttribute = {
  code: string;
  name: string;
  unit: string | null;
  value: string;
};

export type WaaiProductVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  inStock: boolean;
  options: Record<string, string>;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string | null;
  shortDescription: string | null;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  taxRate: string | null;
  stock: number;
  minStock: number;
  status: string;
  isFeatured: boolean;
  isNew: boolean;
  isCampaign: boolean;
  tags: string[] | null;
  specs: Record<string, string> | null;
  technicalSpecs: Record<string, string> | null;
  categoryId: string | null;
  brandId: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  brandName?: string | null;
  brandSlug?: string | null;
  soldCount?: number;
  images?: Array<{ url: string; alt: string | null; isPrimary: boolean }>;
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    price: string | null;
    stock: number;
    options: Record<string, string> | null;
    isActive: boolean;
  }>;
  attributes?: WaaiProductAttribute[];
};

function absoluteUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getAppUrl();
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function mapVariants(
  row: ProductRow,
): WaaiProductVariant[] {
  return (row.variants ?? [])
    .filter((v) => v.isActive)
    .map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price != null ? Number(v.price) : Number(row.price),
      stock: v.stock,
      inStock: v.stock > 0,
      options: v.options ?? {},
    }));
}

export function serializeProduct(row: ProductRow, opts?: { detail?: boolean }) {
  const images = (row.images ?? []).map((img) => ({
    url: absoluteUrl(img.url),
    alt: img.alt,
    isPrimary: img.isPrimary,
  }));
  const primaryImage =
    images.find((img) => img.isPrimary)?.url ?? images[0]?.url ?? null;
  const variants = mapVariants(row);
  const specs = row.specs ?? {};
  const technicalSpecs = row.technicalSpecs ?? {};
  const attributes = row.attributes ?? [];

  const base = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    barcode: row.barcode,
    shortDescription: row.shortDescription,
    price: Number(row.price),
    compareAtPrice:
      row.compareAtPrice != null ? Number(row.compareAtPrice) : null,
    currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "TRY",
    taxRate: row.taxRate != null ? Number(row.taxRate) : 0,
    stock: row.stock,
    inStock: row.stock > 0 || variants.some((v) => v.inStock),
    lowStock: row.stock > 0 && row.stock <= row.minStock,
    isFeatured: row.isFeatured,
    isNew: row.isNew,
    isCampaign: row.isCampaign,
    tags: row.tags ?? [],
    /** Ürün özellikleri (JSON specs) — liste ve detayda */
    specs,
    /** Teknik özellikler — liste ve detayda */
    technicalSpecs,
    /** Filtre/özellik attribute’ları (renk, depolama vb.) */
    attributes,
    /** Satın alınabilir varyantlar (SKU + options) — WhatsApp seçimi için */
    variants,
    hasVariants: variants.length > 0,
    category: row.categoryId
      ? {
          id: row.categoryId,
          name: row.categoryName ?? null,
          slug: row.categorySlug ?? null,
        }
      : null,
    brand: row.brandId
      ? {
          id: row.brandId,
          name: row.brandName ?? null,
          slug: row.brandSlug ?? null,
        }
      : null,
    imageUrl: primaryImage,
    url: `${getAppUrl()}/urun/${row.slug}`,
  };

  if (!opts?.detail) return base;

  return {
    ...base,
    description: row.description,
    soldCount: row.soldCount ?? 0,
    images,
  };
}

export function serializeOrder(order: {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  currency: string;
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  taxTotal: string;
  grandTotal: string;
  couponCode: string | null;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  customerNote: string | null;
  shippingAddress: Record<string, string> | null;
  billingAddress: Record<string, string> | null;
  guestEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    productName: string;
    sku: string | null;
    variantName: string | null;
    quantity: number;
    unitPrice: string;
    total: string;
  }>;
}) {
  const status = order.status as OrderStatus;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[status] ?? order.status,
    paymentStatus: order.paymentStatus,
    paymentStatusLabel:
      PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus,
    paymentMethod: order.paymentMethod,
    currency: order.currency,
    totals: {
      subtotal: Number(order.subtotal),
      discount: Number(order.discountTotal),
      shipping: Number(order.shippingTotal),
      tax: Number(order.taxTotal),
      grandTotal: Number(order.grandTotal),
    },
    couponCode: order.couponCode,
    shipping: {
      carrier: order.shippingCarrier,
      trackingNumber: order.trackingNumber,
      address: order.shippingAddress,
    },
    billingAddress: order.billingAddress,
    customerNote: order.customerNote,
    guestEmail: order.guestEmail,
    items: (order.items ?? []).map((item) => ({
      productName: item.productName,
      sku: item.sku,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
