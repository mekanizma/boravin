"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { orderStatusHistory, orders } from "@/lib/db/schema";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";
import { ensureOrderStatusEnum } from "@/lib/orders/ensure";
import {
  ORDER_STATUSES,
  canTransition,
  orderStatusLabel,
  type OrderStatus,
} from "@/lib/orders/status";
import { notifyOrderStatusWhatsApp } from "@/lib/messaging/whatsapp";
import { normalizeTrackingInput } from "@/lib/waai-api/shipping";

const updateSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(500).optional().nullable(),
  trackingNumber: z.string().max(120).optional().nullable(),
  shippingCarrier: z.string().max(80).optional().nullable(),
  adminNote: z.string().max(2000).optional().nullable(),
});

function phoneFromAddress(address: unknown) {
  if (!address || typeof address !== "object") return null;
  const phone = (address as Record<string, unknown>).phone;
  return typeof phone === "string" ? phone : null;
}

function nameFromAddress(address: unknown) {
  if (!address || typeof address !== "object") return null;
  const fullName = (address as Record<string, unknown>).fullName;
  return typeof fullName === "string" ? fullName : null;
}

function revalidateOrderPaths(orderNumber: string, orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/hesabim");
  revalidatePath("/siparis-takip");
  revalidatePath(`/siparis-takip/${orderNumber}`);
  revalidatePath(`/siparis-onay/${orderNumber}`);
}

export async function updateOrderStatus(raw: z.input<typeof updateSchema>) {
  const session = await requirePermission("ORDER_EDIT");
  await ensureOrderStatusEnum();

  let data: z.infer<typeof updateSchema>;
  try {
    data = updateSchema.parse(raw);
  } catch {
    return { ok: false as const, error: "VALIDATION" };
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, data.orderId),
  });
  if (!order) return { ok: false as const, error: "NOT_FOUND" };

  if (order.status === data.status) {
    return { ok: true as const, status: order.status };
  }

  if (!canTransition(order.status, data.status)) {
    return { ok: false as const, error: "INVALID_TRANSITION" };
  }

  const now = new Date();
  const patch: Partial<typeof orders.$inferInsert> = {
    status: data.status,
    updatedAt: now,
  };

  if (data.status === "shipped") {
    if (data.trackingNumber?.trim()) {
      patch.trackingNumber = normalizeTrackingInput(data.trackingNumber);
    }
    if (data.shippingCarrier?.trim()) {
      patch.shippingCarrier = data.shippingCarrier.trim();
    }
  }

  if (data.adminNote !== undefined) {
    patch.adminNote = data.adminNote?.trim() || null;
  }

  if (
    data.status === "accepted" ||
    data.status === "preparing" ||
    data.status === "shipped" ||
    data.status === "delivered"
  ) {
    if (order.paymentStatus === "pending") {
      patch.paymentStatus = "paid";
    }
  }

  await db.update(orders).set(patch).where(eq(orders.id, order.id));

  const historyNote =
    data.note?.trim() ||
    (data.status === "shipped" && data.trackingNumber?.trim()
      ? `Kargo: ${data.shippingCarrier?.trim() || "—"} · Takip: ${normalizeTrackingInput(data.trackingNumber)}`
      : `Durum: ${orderStatusLabel(order.status)} → ${orderStatusLabel(data.status)}`);

  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    fromStatus: order.status,
    toStatus: data.status,
    note: historyNote,
    changedBy: session.user.id,
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "ORDER_STATUS_UPDATE",
    entityType: "order",
    entityId: order.id,
    before: { status: order.status },
    after: { status: data.status },
  });

  revalidateOrderPaths(order.orderNumber, order.id);

  void notifyOrderStatusWhatsApp({
    orderNumber: order.orderNumber,
    status: data.status as OrderStatus,
    previousStatus: order.status,
    trackingNumber:
      (patch.trackingNumber as string | undefined) ??
      order.trackingNumber ??
      null,
    shippingCarrier:
      (patch.shippingCarrier as string | undefined) ??
      order.shippingCarrier ??
      null,
    customerPhone: phoneFromAddress(order.shippingAddress),
    customerName: nameFromAddress(order.shippingAddress),
  });

  return { ok: true as const, status: data.status };
}

export async function updateOrderTracking(input: {
  orderId: string;
  trackingNumber: string;
  shippingCarrier?: string | null;
}) {
  const session = await requirePermission("ORDER_EDIT");
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, input.orderId),
  });
  if (!order) return { ok: false as const, error: "NOT_FOUND" };

  const trackingNumber = normalizeTrackingInput(input.trackingNumber);
  if (!trackingNumber) return { ok: false as const, error: "VALIDATION" };

  const shippingCarrier =
    input.shippingCarrier?.trim() || order.shippingCarrier;

  await db
    .update(orders)
    .set({
      trackingNumber,
      shippingCarrier: shippingCarrier || null,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    fromStatus: order.status,
    toStatus: order.status,
    note: `Takip güncellendi: ${shippingCarrier || "—"} · ${trackingNumber}`,
    changedBy: session.user.id,
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "ORDER_TRACKING_UPDATE",
    entityType: "order",
    entityId: order.id,
    after: { trackingNumber, shippingCarrier },
  });

  revalidateOrderPaths(order.orderNumber, order.id);

  if (order.status === "shipped" || order.status === "delivered") {
    void notifyOrderStatusWhatsApp({
      orderNumber: order.orderNumber,
      status: order.status as OrderStatus,
      trackingNumber,
      shippingCarrier: shippingCarrier ?? null,
      customerPhone: phoneFromAddress(order.shippingAddress),
      customerName: nameFromAddress(order.shippingAddress),
    });
  }

  return { ok: true as const };
}

export async function updateOrderAdminNote(input: {
  orderId: string;
  adminNote: string;
}) {
  const session = await requirePermission("ORDER_EDIT");
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, input.orderId),
  });
  if (!order) return { ok: false as const, error: "NOT_FOUND" };

  await db
    .update(orders)
    .set({
      adminNote: input.adminNote.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "ORDER_ADMIN_NOTE",
    entityType: "order",
    entityId: order.id,
  });

  revalidatePath(`/admin/orders/${order.id}`);
  return { ok: true as const };
}
