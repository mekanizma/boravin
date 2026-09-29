"use server";

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  customers,
  invoiceItems,
  invoicePayments,
  invoices,
  orderItems,
  orderStatusHistory,
  orders,
  productVariants,
  products,
} from "@/lib/db/schema";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";
import { ensureInvoiceTables } from "@/lib/invoices/ensure";
import {
  computeInvoiceTotals,
  invoiceNumberPrefix,
  sellerDefaults,
  type InvoiceType,
} from "@/lib/invoices/helpers";
import { StockError, applyStockChange } from "@/lib/stock/apply";
import {
  PAYMENT_METHODS,
  type SaleCustomerHit,
  type SaleProductHit,
} from "@/features/sales/types";

const lineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative().optional(),
});

const outboundSchema = z.object({
  buyerType: z.enum(["individual", "corporate"]),
  documentType: z.enum(["invoice", "receipt"]).default("invoice"),
  paymentMethod: z.enum(["nakit", "kredi_karti", "havale"]),
  markPaid: z.boolean().default(true),
  customerId: z.string().uuid().optional().nullable(),
  buyerName: z.string().min(1).max(200),
  buyerTaxOffice: z.string().max(120).optional().nullable(),
  buyerTaxNumber: z.string().max(40).optional().nullable(),
  buyerAddress: z.string().max(500).optional().nullable(),
  buyerPhone: z.string().max(40).optional().nullable(),
  buyerEmail: z
    .string()
    .email()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(lineSchema).min(1),
});

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

export async function searchSaleProducts(q: string): Promise<SaleProductHit[]> {
  await requirePermission("ORDER_EDIT");
  const term = q.trim();
  if (term.length < 1) return [];

  const like = `%${term}%`;
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      price: products.price,
      taxRate: products.taxRate,
      stock: products.stock,
    })
    .from(products)
    .where(
      and(
        or(
          ilike(products.name, like),
          ilike(products.sku, like),
          ilike(products.barcode, like),
        ),
        or(eq(products.status, "active"), eq(products.status, "draft")),
      ),
    )
    .orderBy(products.name)
    .limit(20);

  if (!rows.length) return [];

  const variants = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      name: productVariants.name,
      sku: productVariants.sku,
      stock: productVariants.stock,
      price: productVariants.price,
    })
    .from(productVariants)
    .where(
      inArray(
        productVariants.productId,
        rows.map((r) => r.id),
      ),
    );

  const byProduct = new Map<string, typeof variants>();
  for (const variant of variants) {
    const list = byProduct.get(variant.productId) ?? [];
    list.push(variant);
    byProduct.set(variant.productId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    price: Number(row.price),
    taxRate: Number(row.taxRate ?? 0),
    stock: row.stock,
    variants: (byProduct.get(row.id) ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      stock: v.stock,
      price: v.price != null ? Number(v.price) : null,
    })),
  }));
}

export async function searchSaleCustomers(
  q: string,
): Promise<SaleCustomerHit[]> {
  await requirePermission("ORDER_EDIT");
  const term = q.trim();
  if (term.length < 1) return [];

  const like = `%${term}%`;
  const rows = await db
    .select()
    .from(customers)
    .where(
      or(
        ilike(customers.email, like),
        ilike(customers.firstName, like),
        ilike(customers.lastName, like),
        ilike(customers.phone, like),
        ilike(customers.companyName, like),
        ilike(customers.companyTitle, like),
        ilike(customers.taxNumber, like),
      ),
    )
    .orderBy(desc(customers.updatedAt))
    .limit(15);

  return rows.map((row) => {
    const person = [row.firstName, row.lastName].filter(Boolean).join(" ");
    const company = row.companyTitle || row.companyName;
    const label =
      row.accountType === "corporate"
        ? company || person || row.email
        : person || company || row.email;
    return {
      id: row.id,
      label,
      accountType: row.accountType,
      email: row.email,
      phone: row.phone,
      companyName: row.companyName,
      companyTitle: row.companyTitle,
      taxOffice: row.taxOffice,
      taxNumber: row.taxNumber,
      firstName: row.firstName,
      lastName: row.lastName,
    };
  });
}

export async function createProductOutbound(
  raw: z.input<typeof outboundSchema>,
) {
  const session = await requirePermission("ORDER_EDIT");
  await requirePermission("INVOICE_MANAGE");
  await ensureInvoiceTables();

  let data: z.infer<typeof outboundSchema>;
  try {
    data = outboundSchema.parse(raw);
  } catch {
    return { ok: false as const, error: "VALIDATION" };
  }

  if (data.buyerType === "corporate" && !data.buyerTaxNumber?.trim()) {
    return { ok: false as const, error: "TAX_REQUIRED" };
  }

  const resolved: Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    available: number;
  }> = [];

  for (const line of data.items) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, line.productId),
    });
    if (!product) return { ok: false as const, error: "PRODUCT_NOT_FOUND" };

    if (line.variantId) {
      const variant = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, line.variantId),
      });
      if (!variant || variant.productId !== product.id) {
        return { ok: false as const, error: "PRODUCT_NOT_FOUND" };
      }
      if (variant.stock < line.quantity) {
        return { ok: false as const, error: "INSUFFICIENT_STOCK" };
      }
      resolved.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku || product.sku,
        quantity: line.quantity,
        unitPrice:
          line.unitPrice ??
          (variant.price != null ? Number(variant.price) : Number(product.price)),
        taxRate: Number(product.taxRate ?? 0),
        available: variant.stock,
      });
    } else {
      if (product.stock < line.quantity) {
        return { ok: false as const, error: "INSUFFICIENT_STOCK" };
      }
      resolved.push({
        productId: product.id,
        variantId: null,
        productName: product.name,
        variantName: null,
        sku: product.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice ?? Number(product.price),
        taxRate: Number(product.taxRate ?? 0),
        available: product.stock,
      });
    }
  }

  const invoiceLines = resolved.map((item) => ({
    productId: item.productId,
    description: item.variantName
      ? `${item.productName} (${item.variantName})`
      : item.productName,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxRate: item.taxRate,
    discount: 0,
  }));
  const totals = computeInvoiceTotals(invoiceLines);
  const paymentLabel = PAYMENT_METHODS[data.paymentMethod];
  const markPaid = data.markPaid !== false;
  const documentType: InvoiceType = data.documentType;
  const orderNumber = `CK${Date.now().toString().slice(-10)}`;
  const invoiceNumber = await nextInvoiceNumber(documentType);
  const seller = sellerDefaults();
  const now = new Date();
  const buyerEmail = data.buyerEmail?.trim() || null;

  try {
    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          customerId: data.customerId ?? null,
          status: "delivered",
          paymentStatus: markPaid ? "paid" : "pending",
          paymentMethod: paymentLabel,
          currency: "TRY",
          subtotal: totals.subtotal.toFixed(2),
          discountTotal: totals.discountTotal.toFixed(2),
          shippingTotal: "0",
          taxTotal: totals.taxTotal.toFixed(2),
          grandTotal: totals.grandTotal.toFixed(2),
          guestEmail: buyerEmail,
          adminNote: `Ürün çıkışı · ${paymentLabel}${markPaid ? " · ödendi" : " · ödenmedi"}`,
          customerNote: data.notes?.trim() || null,
          billingAddress: {
            fullName: data.buyerName.trim(),
            phone: data.buyerPhone?.trim() || "",
            email: buyerEmail || "",
            addressLine1: data.buyerAddress?.trim() || "",
            taxOffice: data.buyerTaxOffice?.trim() || "",
            taxNumber: data.buyerTaxNumber?.trim() || "",
            accountType: data.buyerType,
          },
          shippingAddress: {
            fullName: data.buyerName.trim(),
            phone: data.buyerPhone?.trim() || "",
            addressLine1: data.buyerAddress?.trim() || "",
          },
          updatedAt: now,
        })
        .returning();

      if (!order) throw new Error("ORDER_CREATE_FAILED");

      await tx.insert(orderItems).values(
        resolved.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          sku: item.sku,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          discount: "0",
          total: (item.unitPrice * item.quantity).toFixed(2),
        })),
      );

      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        toStatus: "delivered",
        note: `Admin ürün çıkışı · ${paymentLabel}${markPaid ? " · ödendi" : ""}`,
        changedBy: session.user.id,
      });

      for (const item of resolved) {
        await applyStockChange(
          {
            productId: item.productId,
            variantId: item.variantId,
            delta: -item.quantity,
            type: "sale",
            note: item.variantName
              ? `Ürün çıkışı · ${item.variantName}`
              : "Ürün çıkışı",
            reference: orderNumber,
            userId: session.user.id,
          },
          tx,
        );
      }

      const [invoice] = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          type: documentType,
          status: "issued",
          orderId: order.id,
          customerId: data.customerId ?? null,
          currency: "TRY",
          issueDate: now,
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
          paymentMethod: paymentLabel,
          paymentStatus: markPaid ? "paid" : "unpaid",
          paidAmount: markPaid ? totals.grandTotal.toFixed(2) : "0",
          createdBy: session.user.id,
          issuedAt: now,
          updatedAt: now,
        })
        .returning();

      if (!invoice) throw new Error("INVOICE_CREATE_FAILED");

      await tx.insert(invoiceItems).values(
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

      if (markPaid) {
        await tx.insert(invoicePayments).values({
          invoiceId: invoice.id,
          amount: totals.grandTotal.toFixed(2),
          method: paymentLabel,
          paidAt: now,
          note: "Ürün çıkışı — tam ödeme",
          createdBy: session.user.id,
        });
      }

      if (data.customerId) {
        const customer = await tx.query.customers.findFirst({
          where: eq(customers.id, data.customerId),
        });
        if (customer) {
          await tx
            .update(customers)
            .set({
              orderCount: (customer.orderCount ?? 0) + 1,
              totalSpent: (
                Number(customer.totalSpent ?? 0) + totals.grandTotal
              ).toFixed(2),
              lastOrderAt: now,
              updatedAt: now,
            })
            .where(eq(customers.id, customer.id));
        }
      }

      return { order, invoice };
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "PRODUCT_OUTBOUND",
      entityType: "order",
      entityId: result.order.id,
      after: {
        orderNumber,
        invoiceNumber,
        paymentMethod: paymentLabel,
        markPaid,
        grandTotal: totals.grandTotal,
        itemCount: resolved.length,
      },
    });

    revalidatePath("/admin/urun-cikisi");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/invoices");
    revalidatePath("/admin/stock");
    revalidatePath("/admin/products");
    revalidatePath("/admin/customers");
    revalidatePath("/admin");

    return {
      ok: true as const,
      orderId: result.order.id,
      orderNumber,
      invoiceId: result.invoice.id,
      invoiceNumber,
      grandTotal: totals.grandTotal,
      markPaid,
    };
  } catch (error) {
    if (error instanceof StockError) {
      return { ok: false as const, error: error.code };
    }
    console.error("createProductOutbound", error);
    return { ok: false as const, error: "CREATE_FAILED" };
  }
}
