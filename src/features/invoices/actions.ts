"use server";

import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  customers,
  invoiceItems,
  invoicePayments,
  invoices,
  orderItems,
  orders,
} from "@/lib/db/schema";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";
import { ensureInvoiceTables } from "@/lib/invoices/ensure";
import {
  computeInvoiceTotals,
  derivePaymentStatus,
  invoiceNumberPrefix,
  money,
  sellerDefaults,
  type InvoicePaymentStatus,
  type InvoiceType,
} from "@/lib/invoices/helpers";

const lineSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(255),
  sku: z.string().max(64).optional().nullable(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  taxRate: z.coerce.number().nonnegative().max(100).optional().default(0),
  discount: z.coerce.number().nonnegative().optional().default(0),
});

const createSchema = z.object({
  type: z.enum(["invoice", "receipt", "proforma"]).default("invoice"),
  status: z.enum(["draft", "issued"]).default("issued"),
  orderId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  currency: z.string().length(3).default("TRY"),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  buyerName: z.string().min(1).max(200),
  buyerTaxOffice: z.string().max(120).optional().nullable(),
  buyerTaxNumber: z.string().max(40).optional().nullable(),
  buyerAddress: z.string().max(500).optional().nullable(),
  buyerPhone: z.string().max(40).optional().nullable(),
  buyerEmail: z.string().email().optional().nullable().or(z.literal("")),
  notes: z.string().max(2000).optional().nullable(),
  paymentMethod: z.string().max(64).optional().nullable(),
  paymentStatus: z
    .enum(["unpaid", "partial", "paid"])
    .optional()
    .default("unpaid"),
  items: z.array(lineSchema).min(1),
});

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function nextInvoiceNumber(type: InvoiceType) {
  const prefix = invoiceNumberPrefix(type);
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  const rows = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(sql`${invoices.invoiceNumber} like ${like}`)
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);
  const last = rows[0]?.invoiceNumber ?? "";
  const seq = Number(last.split("-").pop() ?? "0");
  const next = Number.isFinite(seq) ? seq + 1 : 1;
  return `${prefix}-${year}-${String(next).padStart(5, "0")}`;
}

export async function createInvoice(raw: z.input<typeof createSchema>) {
  const session = await requirePermission("INVOICE_MANAGE");
  await ensureInvoiceTables();
  const data = createSchema.parse(raw);
  const totals = computeInvoiceTotals(data.items);
  const seller = sellerDefaults();
  const issueDate = parseDate(data.issueDate) ?? new Date();
  const dueDate = parseDate(data.dueDate);
  const invoiceNumber = await nextInvoiceNumber(data.type);
  const now = new Date();
  const status = data.status;
  const buyerEmail = data.buyerEmail?.trim() || null;

  const paymentStatus = data.paymentStatus ?? "unpaid";
  const paidAmount = paymentStatus === "paid" ? totals.grandTotal : 0;

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber,
      type: data.type,
      status,
      orderId: data.orderId ?? null,
      customerId: data.customerId ?? null,
      currency: data.currency,
      issueDate,
      dueDate,
      ...seller,
      buyerName: data.buyerName.trim(),
      buyerTaxOffice: data.buyerTaxOffice?.trim() || null,
      buyerTaxNumber: data.buyerTaxNumber?.trim() || null,
      buyerAddress: data.buyerAddress?.trim() || null,
      buyerPhone: data.buyerPhone?.trim() || null,
      buyerEmail,
      subtotal: totals.subtotal.toFixed(2),
      discountTotal: totals.discountTotal.toFixed(2),
      taxTotal: totals.taxTotal.toFixed(2),
      grandTotal: totals.grandTotal.toFixed(2),
      notes: data.notes?.trim() || null,
      paymentMethod: data.paymentMethod?.trim() || null,
      paymentStatus,
      paidAmount: paidAmount.toFixed(2),
      createdBy: session.user.id,
      issuedAt: status === "issued" ? now : null,
      updatedAt: now,
    })
    .returning();

  if (!invoice) return { ok: false as const, error: "CREATE_FAILED" };

  await db.insert(invoiceItems).values(
    totals.lines.map((line) => ({
      invoiceId: invoice.id,
      productId: line.productId ?? null,
      description: line.description.trim(),
      sku: line.sku?.trim() || null,
      quantity: line.quantity.toFixed(3),
      unitPrice: line.unitPrice.toFixed(2),
      taxRate: (line.taxRate ?? 0).toFixed(2),
      discount: (line.discount ?? 0).toFixed(2),
      lineSubtotal: line.lineSubtotal.toFixed(2),
      lineTax: line.lineTax.toFixed(2),
      lineTotal: line.lineTotal.toFixed(2),
      sortOrder: line.sortOrder,
    })),
  );

  if (paidAmount > 0) {
    await db.insert(invoicePayments).values({
      invoiceId: invoice.id,
      amount: paidAmount.toFixed(2),
      method: data.paymentMethod?.trim() || null,
      paidAt: now,
      note: "Oluşturma sırasında tam ödeme",
      createdBy: session.user.id,
    });
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "INVOICE_CREATE",
    entityType: "invoice",
    entityId: invoice.id,
    after: { invoiceNumber, type: data.type, status, grandTotal: totals.grandTotal },
  });

  revalidatePath("/admin/invoices");
  if (data.orderId) revalidatePath(`/admin/orders/${data.orderId}`);
  return { ok: true as const, id: invoice.id, invoiceNumber };
}

export async function createInvoiceFromOrder(input: {
  orderId: string;
  type?: InvoiceType;
  status?: "draft" | "issued";
}) {
  await requirePermission("INVOICE_MANAGE");
  await ensureInvoiceTables();
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, input.orderId),
  });
  if (!order) return { ok: false as const, error: "ORDER_NOT_FOUND" };

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  if (!items.length) return { ok: false as const, error: "EMPTY_ORDER" };

  let customer = null as typeof customers.$inferSelect | null;
  if (order.customerId) {
    customer =
      (await db.query.customers.findFirst({
        where: eq(customers.id, order.customerId),
      })) ?? null;
  }

  const billing = (order.billingAddress ?? {}) as Record<string, string>;
  const shipping = (order.shippingAddress ?? {}) as Record<string, string>;
  const buyerName =
    billing.fullName ||
    shipping.fullName ||
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    customer?.companyTitle ||
    customer?.companyName ||
    order.guestEmail ||
    "Müşteri";

  return createInvoice({
    type: input.type ?? "invoice",
    status: input.status ?? "issued",
    orderId: order.id,
    customerId: order.customerId,
    currency: order.currency,
    buyerName,
    buyerTaxOffice: customer?.taxOffice ?? billing.taxOffice ?? null,
    buyerTaxNumber: customer?.taxNumber ?? billing.taxNumber ?? null,
    buyerAddress:
      [billing.addressLine1 ?? shipping.addressLine1, billing.city ?? shipping.city]
        .filter(Boolean)
        .join(", ") || null,
    buyerPhone: billing.phone || shipping.phone || customer?.phone || null,
    buyerEmail: order.guestEmail || customer?.email || null,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus === "paid" ? "paid" : "unpaid",
    notes: order.customerNote,
    items: items.map((item) => ({
      productId: item.productId,
      description: item.variantName
        ? `${item.productName} (${item.variantName})`
        : item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      taxRate: 0,
      discount: Number(item.discount ?? 0),
    })),
  });
}

export async function issueInvoice(id: string) {
  const session = await requirePermission("INVOICE_MANAGE");
  await ensureInvoiceTables();
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
  });
  if (!invoice) return { ok: false as const, error: "NOT_FOUND" };
  if (invoice.status === "cancelled") {
    return { ok: false as const, error: "CANCELLED" };
  }
  if (invoice.status === "issued") return { ok: true as const };

  const now = new Date();
  await db
    .update(invoices)
    .set({ status: "issued", issuedAt: now, updatedAt: now })
    .where(eq(invoices.id, id));

  await writeAuditLog({
    userId: session.user.id,
    action: "INVOICE_ISSUE",
    entityType: "invoice",
    entityId: id,
  });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
  return { ok: true as const };
}

export async function cancelInvoice(id: string) {
  const session = await requirePermission("INVOICE_MANAGE");
  await ensureInvoiceTables();
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
  });
  if (!invoice) return { ok: false as const, error: "NOT_FOUND" };
  if (invoice.status === "cancelled") return { ok: true as const };

  const now = new Date();
  await db
    .update(invoices)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(eq(invoices.id, id));

  await writeAuditLog({
    userId: session.user.id,
    action: "INVOICE_CANCEL",
    entityType: "invoice",
    entityId: id,
  });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
  return { ok: true as const };
}

export async function updateInvoicePaymentStatus(
  id: string,
  paymentStatus: InvoicePaymentStatus,
) {
  const session = await requirePermission("INVOICE_MANAGE");
  await ensureInvoiceTables();
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
  });
  if (!invoice) return { ok: false as const, error: "NOT_FOUND" };

  const grandTotal = Number(invoice.grandTotal);
  const paidAmount =
    paymentStatus === "paid"
      ? grandTotal
      : paymentStatus === "unpaid"
        ? 0
        : Math.max(0, Math.min(grandTotal, Number(invoice.paidAmount) || grandTotal / 2));

  await db
    .update(invoices)
    .set({
      paymentStatus,
      paidAmount: money(paidAmount).toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));

  await writeAuditLog({
    userId: session.user.id,
    action: "INVOICE_PAYMENT_UPDATE",
    entityType: "invoice",
    entityId: id,
    after: { paymentStatus, paidAmount },
  });

  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  return { ok: true as const };
}

async function syncInvoicePaidAmount(invoiceId: string, userId?: string | null) {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });
  if (!invoice) return null;

  const [sumRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoicePayments.amount}), 0)`,
    })
    .from(invoicePayments)
    .where(eq(invoicePayments.invoiceId, invoiceId));

  const paidAmount = money(Number(sumRow?.total ?? 0));
  const paymentStatus = derivePaymentStatus(Number(invoice.grandTotal), paidAmount);

  await db
    .update(invoices)
    .set({
      paidAmount: paidAmount.toFixed(2),
      paymentStatus,
      paymentMethod:
        paymentStatus === "paid"
          ? invoice.paymentMethod
          : invoice.paymentMethod,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  if (userId) {
    await writeAuditLog({
      userId,
      action: "INVOICE_PAYMENT_SYNC",
      entityType: "invoice",
      entityId: invoiceId,
      after: { paidAmount, paymentStatus },
    });
  }

  return { paidAmount, paymentStatus, remaining: money(Number(invoice.grandTotal) - paidAmount) };
}

const paymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  method: z.string().max(64).optional().nullable(),
  paidAt: z.string().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export async function recordInvoicePayment(raw: z.input<typeof paymentSchema>) {
  const session = await requirePermission("INVOICE_MANAGE");
  await ensureInvoiceTables();

  let data: z.infer<typeof paymentSchema>;
  try {
    data = paymentSchema.parse(raw);
  } catch {
    return { ok: false as const, error: "VALIDATION" };
  }

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, data.invoiceId),
  });
  if (!invoice) return { ok: false as const, error: "NOT_FOUND" };
  if (invoice.status === "cancelled") {
    return { ok: false as const, error: "CANCELLED" };
  }

  const remaining = money(Number(invoice.grandTotal) - Number(invoice.paidAmount ?? 0));
  if (data.amount > remaining + 0.01) {
    return { ok: false as const, error: "AMOUNT_EXCEEDS" };
  }

  const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    return { ok: false as const, error: "VALIDATION" };
  }

  const [payment] = await db
    .insert(invoicePayments)
    .values({
      invoiceId: invoice.id,
      amount: money(data.amount).toFixed(2),
      method: data.method?.trim() || invoice.paymentMethod || null,
      paidAt,
      note: data.note?.trim() || null,
      createdBy: session.user.id,
    })
    .returning();

  if (!payment) return { ok: false as const, error: "CREATE_FAILED" };

  const synced = await syncInvoicePaidAmount(invoice.id, session.user.id);

  if (data.method?.trim()) {
    await db
      .update(invoices)
      .set({ paymentMethod: data.method.trim(), updatedAt: new Date() })
      .where(eq(invoices.id, invoice.id));
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "INVOICE_PAYMENT_RECORD",
    entityType: "invoice_payment",
    entityId: payment.id,
    after: { invoiceId: invoice.id, amount: data.amount, method: data.method },
  });

  revalidatePath(`/admin/invoices/${invoice.id}`);
  revalidatePath("/admin/invoices");
  return {
    ok: true as const,
    paymentId: payment.id,
    paidAmount: synced?.paidAmount ?? 0,
    paymentStatus: synced?.paymentStatus ?? "unpaid",
    remaining: synced?.remaining ?? 0,
  };
}

export async function deleteInvoicePayment(paymentId: string) {
  const session = await requirePermission("INVOICE_MANAGE");
  await ensureInvoiceTables();

  const payment = await db.query.invoicePayments.findFirst({
    where: eq(invoicePayments.id, paymentId),
  });
  if (!payment) return { ok: false as const, error: "NOT_FOUND" };

  await db.delete(invoicePayments).where(eq(invoicePayments.id, paymentId));
  const synced = await syncInvoicePaidAmount(payment.invoiceId, session.user.id);

  await writeAuditLog({
    userId: session.user.id,
    action: "INVOICE_PAYMENT_DELETE",
    entityType: "invoice_payment",
    entityId: paymentId,
    before: { amount: payment.amount, invoiceId: payment.invoiceId },
  });

  revalidatePath(`/admin/invoices/${payment.invoiceId}`);
  revalidatePath("/admin/invoices");
  return {
    ok: true as const,
    paidAmount: synced?.paidAmount ?? 0,
    paymentStatus: synced?.paymentStatus ?? "unpaid",
  };
}
