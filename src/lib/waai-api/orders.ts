import { z } from "zod";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  orderItems,
  orderStatusHistory,
  orders,
  productVariants,
  products,
  shippingMethods,
} from "@/lib/db/schema";
import { applyStockChange, StockError } from "@/lib/stock/apply";
import { orderStatusLabel } from "@/lib/orders/status";
import { serializeOrder } from "@/lib/waai-api/serialize";

export const createOrderSchema = z.object({
  customer: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(7),
    email: z.string().email().optional(),
    line1: z.string().min(3),
    line2: z.string().optional(),
    city: z.string().min(2),
    district: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().default("CY"),
  }),
  items: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(50),
  paymentMethod: z
    .enum(["cod", "whatsapp", "card", "transfer", "mock_card"])
    .default("whatsapp"),
  customerNote: z.string().max(2000).optional(),
  markPaid: z.boolean().optional(),
});

async function resolveLine(sku: string, quantity: number): Promise<
  | {
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      sku: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }
  | { error: "PRODUCT_NOT_FOUND" | "INSUFFICIENT_STOCK"; sku: string; available?: number }
> {
  const normalized = sku.trim();
  const variant = await db.query.productVariants.findFirst({
    where: and(
      eq(productVariants.sku, normalized),
      eq(productVariants.isActive, true),
    ),
  });

  if (variant) {
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.id, variant.productId),
        eq(products.status, "active"),
      ),
    });
    if (!product) return { error: "PRODUCT_NOT_FOUND" as const, sku };
    if (variant.stock < quantity) {
      return {
        error: "INSUFFICIENT_STOCK" as const,
        sku,
        available: variant.stock,
      };
    }
    const unitPrice =
      variant.price != null ? Number(variant.price) : Number(product.price);
    return {
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      quantity,
      unitPrice,
      taxRate: Number(product.taxRate ?? 0),
    };
  }

  const product = await db.query.products.findFirst({
    where: and(
      eq(products.status, "active"),
      or(
        eq(products.sku, normalized),
        eq(products.barcode, normalized),
        eq(products.slug, normalized),
      ),
    ),
  });
  if (!product) return { error: "PRODUCT_NOT_FOUND" as const, sku };
  if (product.stock < quantity) {
    return {
      error: "INSUFFICIENT_STOCK" as const,
      sku,
      available: product.stock,
    };
  }

  return {
    productId: product.id,
    variantId: null as string | null,
    productName: product.name,
    variantName: null as string | null,
    sku: product.sku,
    quantity,
    unitPrice: Number(product.price),
    taxRate: Number(product.taxRate ?? 0),
  };
}

export async function createWaaiOrder(raw: unknown) {
  const data = createOrderSchema.parse(raw);
  const resolved: Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }> = [];
  for (const line of data.items) {
    const item = await resolveLine(line.sku, line.quantity);
    if ("error" in item) {
      return { ok: false as const, error: item };
    }
    resolved.push(item);
  }

  const subtotal = resolved.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const taxTotal = resolved.reduce((sum, item) => {
    const line = item.unitPrice * item.quantity;
    return sum + (line * item.taxRate) / 100;
  }, 0);

  const methods = await db.query.shippingMethods.findMany({
    where: eq(shippingMethods.isActive, true),
  });
  const method = methods[0];
  const shippingPrice = method ? Number(method.price) : 0;
  const freeAbove = method?.freeAbove ? Number(method.freeAbove) : null;
  const shippingTotal =
    freeAbove != null && subtotal >= freeAbove ? 0 : shippingPrice;

  const grandTotal = Number((subtotal + taxTotal + shippingTotal).toFixed(2));
  const currency = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "TRY";
  const paidUpfront =
    data.markPaid === true ||
    data.paymentMethod === "card" ||
    data.paymentMethod === "mock_card";
  const status = paidUpfront ? "preparing" : "accepted";
  const paymentStatus = paidUpfront ? "paid" : "pending";
  const orderNumber = `WA${Date.now().toString().slice(-10)}`;

  const shippingAddress = {
    fullName: data.customer.fullName.trim(),
    phone: data.customer.phone.trim(),
    email: data.customer.email?.trim().toLowerCase() ?? "",
    line1: data.customer.line1.trim(),
    line2: data.customer.line2?.trim() ?? "",
    city: data.customer.city.trim(),
    district: data.customer.district?.trim() ?? "",
    postalCode: data.customer.postalCode?.trim() ?? "",
    country: data.customer.country || "CY",
  };

  let customerId: string | null = null;
  if (data.customer.email) {
    const email = data.customer.email.trim().toLowerCase();
    const existing = await db.query.customers.findFirst({
      where: eq(customers.email, email),
    });
    if (existing) {
      customerId = existing.id;
    } else {
      const nameParts = data.customer.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] ?? data.customer.fullName;
      const lastName = nameParts.slice(1).join(" ") || null;
      const [created] = await db
        .insert(customers)
        .values({
          email,
          firstName,
          lastName,
          phone: data.customer.phone.trim(),
          segment: "whatsapp",
        })
        .returning();
      customerId = created?.id ?? null;
    }
  }

  try {
    const order = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(orders)
        .values({
          orderNumber,
          customerId,
          status,
          paymentStatus,
          paymentMethod: data.paymentMethod,
          currency,
          subtotal: subtotal.toFixed(2),
          discountTotal: "0",
          shippingTotal: shippingTotal.toFixed(2),
          taxTotal: taxTotal.toFixed(2),
          grandTotal: grandTotal.toFixed(2),
          shippingCarrier: method?.carrier ?? null,
          guestEmail: data.customer.email?.trim().toLowerCase() ?? null,
          customerNote: data.customerNote?.trim() || "WhatsApp AI siparişi",
          adminNote: "Waai API üzerinden oluşturuldu",
          shippingAddress,
          billingAddress: shippingAddress,
        })
        .returning();

      if (!created) throw new Error("ORDER_CREATE_FAILED");

      await tx.insert(orderItems).values(
        resolved.map((item) => ({
          orderId: created.id,
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
        orderId: created.id,
        toStatus: status,
        note: "Waai API siparişi oluşturuldu",
      });

      for (const item of resolved) {
        await applyStockChange(
          {
            productId: item.productId,
            variantId: item.variantId,
            delta: -item.quantity,
            type: "sale",
            note: item.variantName
              ? `Waai satış · ${item.variantName}`
              : "Waai satış",
            reference: orderNumber,
          },
          tx,
        );
      }

      return created;
    });

    const full = await getOrderByNumber(order.orderNumber);
    return { ok: true as const, order: full };
  } catch (error) {
    if (error instanceof StockError) {
      return {
        ok: false as const,
        error: { error: error.code, sku: "unknown" },
      };
    }
    throw error;
  }
}

export async function getOrderByNumber(orderNumber: string) {
  const normalized = orderNumber.trim();
  if (!normalized) return null;

  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, normalized),
  });
  if (!order) return null;

  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, order.id),
  });

  return serializeOrder({ ...order, items });
}

export { orderStatusLabel };
