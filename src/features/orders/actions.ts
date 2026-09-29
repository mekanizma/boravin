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
} from "@/lib/orders/status";

const updateSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(500).optional().nullable(),
  trackingNumber: z.string().max(120).optional().nullable(),
  shippingCarrier: z.string().max(80).optional().nullable(),
  adminNote: z.string().max(2000).optional().nullable(),
});

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
      patch.trackingNumber = data.trackingNumber.trim();
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
      ? `Kargo: ${data.shippingCarrier?.trim() || "—"} · Takip: ${data.trackingNumber.trim()}`
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

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath("/admin");
  revalidatePath("/hesabim");

  return { ok: true as const, status: data.status };
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
