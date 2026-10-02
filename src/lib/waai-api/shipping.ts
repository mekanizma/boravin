import { eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/orders/status";
import { getShippingProvider } from "@/lib/shipping";
import { getAppUrl } from "@/lib/env/app-url";

/** Normalize tracking / order lookup keys from WhatsApp free text. */
export function normalizeTrackingInput(value: string) {
  return value
    .trim()
    .replace(/^[#:\s]+/, "")
    .replace(/\s+/g, "")
    .toUpperCase();
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

  const normalized = normalizeTrackingInput(raw);
  const rawTrim = raw.trim();

  // Exact / normalized tracking match, then order-number fallback (WA… / BV…).
  const order =
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

  let resolvedVia: "tracking" | "orderNumber" | "provider" | null = null;
  if (order?.trackingNumber && normalizeTrackingInput(order.trackingNumber) === normalized) {
    resolvedVia = "tracking";
  } else if (order) {
    resolvedVia =
      normalizeTrackingInput(order.orderNumber) === normalized
        ? "orderNumber"
        : "tracking";
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
