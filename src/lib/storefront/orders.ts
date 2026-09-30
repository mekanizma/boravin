import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orderItems,
  orderStatusHistory,
  orders,
} from "@/lib/db/schema";
import { getCurrentCustomer } from "@/lib/account/session";

export type StorefrontOrderItem = {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  total: string;
};

export type StorefrontOrderHistory = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: Date;
};

export type StorefrontOrder = {
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
  guestEmail: string | null;
  customerId: string | null;
  createdAt: Date;
  items: StorefrontOrderItem[];
  history: StorefrontOrderHistory[];
};

function mapOrder(
  order: typeof orders.$inferSelect,
  items: (typeof orderItems.$inferSelect)[],
  history: (typeof orderStatusHistory.$inferSelect)[],
): StorefrontOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    currency: order.currency,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    grandTotal: order.grandTotal,
    couponCode: order.couponCode,
    shippingCarrier: order.shippingCarrier,
    trackingNumber: order.trackingNumber,
    customerNote: order.customerNote,
    shippingAddress: (order.shippingAddress as Record<string, string> | null) ?? null,
    guestEmail: order.guestEmail,
    customerId: order.customerId,
    createdAt: order.createdAt,
    items: items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
    history: history.map((row) => ({
      id: row.id,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      note: row.note,
      createdAt: row.createdAt,
    })),
  };
}

async function loadOrderBundle(order: typeof orders.$inferSelect) {
  const [items, history] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, order.id))
      .orderBy(desc(orderStatusHistory.createdAt)),
  ]);
  return mapOrder(order, items, history);
}

/** Load a single order by public order number (no auth gate). */
export async function getOrderByNumber(
  orderNumber: string,
): Promise<StorefrontOrder | null> {
  const trimmed = orderNumber.trim();
  if (!trimmed) return null;
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, trimmed),
    });
    if (!order) return null;
    return loadOrderBundle(order);
  } catch {
    return null;
  }
}

/**
 * Detail access rules:
 * - allowPublic: post-checkout confirmation (order number is the token)
 * - logged-in owner
 * - guest order (+ optional email match when provided)
 */
export async function getOrderForViewer(
  orderNumber: string,
  opts?: { email?: string | null; allowPublic?: boolean },
): Promise<StorefrontOrder | null> {
  const order = await getOrderByNumber(orderNumber);
  if (!order) return null;
  if (opts?.allowPublic) return order;

  const customer = await getCurrentCustomer();
  if (customer && order.customerId === customer.id) return order;

  const email = opts?.email?.trim().toLowerCase() || "";

  if (!order.customerId) {
    if (!email) return order;
    if (!order.guestEmail) return order;
    return order.guestEmail.toLowerCase() === email ? order : null;
  }

  // Customer-owned order, viewer not the owner (or logged out)
  if (email && customer?.email.toLowerCase() === email && order.customerId === customer.id) {
    return order;
  }

  return null;
}

export async function listCustomerOrders(): Promise<StorefrontOrder[]> {
  const customer = await getCurrentCustomer();
  if (!customer) return [];

  try {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customer.id))
      .orderBy(desc(orders.createdAt));

    const detailed = await Promise.all(rows.map((row) => loadOrderBundle(row)));
    return detailed;
  } catch {
    return [];
  }
}

export async function findOrderByNumberAndEmail(
  orderNumber: string,
  email: string,
): Promise<StorefrontOrder | null> {
  const order = await getOrderByNumber(orderNumber);
  if (!order) return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const customer = await getCurrentCustomer();
  if (customer && order.customerId === customer.id) return order;
  if (order.guestEmail?.toLowerCase() === normalized) return order;

  if (order.customerId) {
    // Soft check: if logged-in user's email matches and owns order — already handled.
    // Don't leak other customers' orders by number alone when email wrong.
    return null;
  }

  return null;
}

export async function customerHasOrder(orderId: string) {
  const customer = await getCurrentCustomer();
  if (!customer) return false;
  const row = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  return Boolean(row && row.customerId === customer.id);
}
