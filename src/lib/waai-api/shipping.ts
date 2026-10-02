import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/orders/status";
import { getShippingProvider } from "@/lib/shipping";

export async function getShippingByTracking(trackingNumber: string) {
  const normalized = trackingNumber.trim();
  if (!normalized) return null;

  const order = await db.query.orders.findFirst({
    where: eq(orders.trackingNumber, normalized),
  });

  let providerStatus: {
    status: string;
    carrier: string;
    shipmentId?: string;
    labelUrl?: string;
  } | null = null;

  try {
    const provider = getShippingProvider();
    if (provider.getTracking) {
      const result = await provider.getTracking(normalized);
      providerStatus = {
        status: result.status,
        carrier: result.carrier,
        shipmentId: result.shipmentId,
        labelUrl: result.labelUrl,
      };
    }
  } catch {
    // Order row is the source of truth when mock provider has no in-memory shipment.
  }

  if (!order && !providerStatus) return null;

  return {
    trackingNumber: normalized,
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
    updatedAt: order?.updatedAt?.toISOString() ?? null,
  };
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
