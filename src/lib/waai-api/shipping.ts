import { desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/orders/status";
import { getShippingProvider } from "@/lib/shipping";
import { getAppUrl } from "@/lib/env/app-url";
import { toWhatsAppDigits } from "@/lib/messaging/whatsapp";

/** Normalize tracking / order lookup keys from WhatsApp free text. */
export function normalizeTrackingInput(value: string) {
  return value
    .trim()
    .replace(/^[#:\s]+/, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

/** Pull WA… / BV… from chatty WhatsApp text when present. */
export function extractOrderLookupKey(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  const fromRaw = raw.toUpperCase().match(/\b((?:WA|BV)[A-Z0-9]{4,})\b/);
  if (fromRaw?.[1]) return fromRaw[1];
  return normalizeTrackingInput(raw);
}

/** True when the query is mostly a phone number (not WA/BV order id). */
export function looksLikePhoneQuery(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/(?:WA|BV)[A-Z0-9]{4,}/i.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  const compact = trimmed.replace(/[\s()+.-]/g, "");
  return digits.length / Math.max(compact.length, 1) >= 0.8;
}

/** Last 10 national digits for fuzzy phone match across 0/90/+90 forms. */
export function phoneLast10(value: string) {
  const wa = toWhatsAppDigits(value);
  if (wa && wa.length >= 10) return wa.slice(-10);
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return null;
}

function phoneAddressMatchSql(last10: string) {
  const shippingDigits = sql`regexp_replace(coalesce(${orders.shippingAddress}->>'phone', ''), '[^0-9]', '', 'g')`;
  const billingDigits = sql`regexp_replace(coalesce(${orders.billingAddress}->>'phone', ''), '[^0-9]', '', 'g')`;
  return or(
    sql`right(${shippingDigits}, 10) = ${last10}`,
    sql`right(${billingDigits}, 10) = ${last10}`,
  );
}

export async function findLatestOrderByPhone(phone: string) {
  const last10 = phoneLast10(phone);
  if (!last10) return null;
  const match = phoneAddressMatchSql(last10);
  if (!match) return null;
  return db.query.orders.findFirst({
    where: match,
    orderBy: [desc(orders.createdAt)],
  });
}

function inferShipmentStatus(status?: string | null) {
  switch (status) {
    case "shipped":
      return "in_transit";
    case "delivered":
      return "delivered";
    case "cancelled":
    case "returned":
      return "cancelled";
    case "preparing":
    case "accepted":
    case "new":
    case "awaiting_payment":
      return "created";
    default:
      return "unknown";
  }
}

function addressPhone(address: unknown) {
  if (!address || typeof address !== "object") return null;
  const phone = (address as Record<string, unknown>).phone;
  return typeof phone === "string" && phone.trim() ? phone.trim() : null;
}

export async function getShippingByTracking(trackingNumber: string) {
  const raw = trackingNumber.trim();
  if (!raw) return null;

  const lookupKey = extractOrderLookupKey(raw);
  const normalized = normalizeTrackingInput(lookupKey || raw);
  const rawTrim = raw.trim();

  let order:
    | typeof orders.$inferSelect
    | null
    | undefined =
    (await db.query.orders.findFirst({
      where: or(
        eq(orders.trackingNumber, rawTrim),
        eq(orders.trackingNumber, normalized),
        sql`upper(replace(coalesce(${orders.trackingNumber}, ''), ' ', '')) = ${normalized}`,
      ),
    })) ??
    (await db.query.orders.findFirst({
      where: or(
        eq(orders.orderNumber, rawTrim),
        eq(orders.orderNumber, normalized),
        sql`upper(${orders.orderNumber}) = ${normalized}`,
      ),
    }));

  let resolvedVia: "tracking" | "orderNumber" | "phone" | "provider" | null =
    null;
  if (order?.trackingNumber && normalizeTrackingInput(order.trackingNumber) === normalized) {
    resolvedVia = "tracking";
  } else if (order) {
    resolvedVia =
      normalizeTrackingInput(order.orderNumber) === normalized
        ? "orderNumber"
        : "tracking";
  }

  if (!order && looksLikePhoneQuery(raw)) {
    order = await findLatestOrderByPhone(raw);
    if (order) resolvedVia = "phone";
  }

  let providerStatus: {
    status: string;
    carrier: string;
    shipmentId?: string;
    labelUrl?: string;
  } | null = null;

  try {
    const provider = getShippingProvider();
    if (provider.getTracking) {
      const result = await provider.getTracking(rawTrim);
      providerStatus = {
        status: result.status,
        carrier: result.carrier,
        shipmentId: result.shipmentId,
        labelUrl: result.labelUrl,
      };
      if (!resolvedVia) resolvedVia = "provider";
    }
  } catch {
    // Order row is the source of truth when mock provider has no in-memory shipment.
  }

  if (!order && !providerStatus) return null;

  const track =
    order?.trackingNumber?.trim() ||
    (resolvedVia === "tracking" ? rawTrim : null) ||
    null;

  return {
    trackingNumber: track,
    orderNumber: order?.orderNumber ?? null,
    orderStatus: order?.status ?? null,
    orderStatusLabel: order ? orderStatusLabel(order.status) : null,
    paymentStatus: order?.paymentStatus ?? null,
    paymentStatusLabel: order
      ? paymentStatusLabel(order.paymentStatus)
      : null,
    carrier: order?.shippingCarrier ?? providerStatus?.carrier ?? null,
    shipmentStatus: providerStatus?.status ?? inferShipmentStatus(order?.status),
    shippingAddress: order?.shippingAddress ?? null,
    customerPhone: addressPhone(order?.shippingAddress),
    storefrontTrackUrl: order
      ? `${getAppUrl()}/siparis-takip/${order.orderNumber}`
      : null,
    resolvedVia,
    message:
      order && !track
        ? "Sipariş bulundu ancak takip numarası henüz girilmemiş."
        : order
          ? `Sipariş ${orderStatusLabel(order.status)}.`
          : "Kargo kaydı bulundu.",
    updatedAt: order?.updatedAt?.toISOString() ?? null,
  };
}
