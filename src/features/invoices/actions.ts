"use server";

import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  customers,
  invoiceItems,
  invoices,
  orderItems,
  orders,
} from "@/lib/db/schema";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";
import { ensureInvoiceTables } from "@/lib/invoices/ensure";
import {
  computeInvoiceTotals,
  invoiceNumberPrefix,
  sellerDefaults,
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
      paymentStatus: data.paymentStatus ?? "unpaid",
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
  paymentStatus: "unpaid" | "partial" | "paid",
) {
  const session = await requirePermission("INVOICE_MANAGE");
  await ensureInvoiceTables();
  await db
    .update(invoices)
    .set({ paymentStatus, updatedAt: new Date() })
    .where(eq(invoices.id, id));

  await writeAuditLog({
    userId: session.user.id,
    action: "INVOICE_PAYMENT_UPDATE",
    entityType: "invoice",
    entityId: id,
    after: { paymentStatus },
  });

  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  return { ok: true as const };
}
