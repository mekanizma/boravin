"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  cartItems,
  carts,
  coupons,
  productImages,
  products,
  productVariants,
  shippingMethods,
} from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { applyStockChange } from "@/lib/stock/apply";
import { publicImageUrl } from "@/lib/media/url";

const CART_COOKIE = "bv_cart";

async function getOrCreateCartId() {
  const jar = await cookies();
  let sessionId = jar.get(CART_COOKIE)?.value;
  if (!sessionId) {
    sessionId = nanoid(24);
    jar.set(CART_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  let cart = await db.query.carts.findFirst({
    where: eq(carts.sessionId, sessionId),
  });
  if (!cart) {
    const [created] = await db
      .insert(carts)
      .values({ sessionId, currency: "TRY" })
      .returning();
    cart = created;
  }
  return cart;
}

export type EnrichedCartItem = Awaited<
  ReturnType<typeof getCart>
>["items"][number];

export async function getCart() {
  try {
    const cart = await getOrCreateCartId();
    const items = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id));

    if (!items.length) {
      return { cart, items: [] as const };
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const variantIds = [
      ...new Set(
        items
          .map((item) => item.variantId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [productRows, imageRows, variantRows] = await Promise.all([
      db.select().from(products).where(inArray(products.id, productIds)),
      db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds)),
      variantIds.length
        ? db
            .select()
            .from(productVariants)
            .where(inArray(productVariants.id, variantIds))
        : Promise.resolve([] as (typeof productVariants.$inferSelect)[]),
    ]);

    const productMap = new Map(productRows.map((row) => [row.id, row]));
    const variantMap = new Map(variantRows.map((row) => [row.id, row]));
    const imagesByProduct = new Map<string, typeof imageRows>();
    for (const image of imageRows) {
      const list = imagesByProduct.get(image.productId) ?? [];
      list.push(image);
      imagesByProduct.set(image.productId, list);
    }

    const enriched = items.map((item) => {
      const product = productMap.get(item.productId) ?? null;
      const images = (imagesByProduct.get(item.productId) ?? [])
        .slice()
        .sort(
          (a, b) =>
            Number(b.isPrimary) - Number(a.isPrimary) ||
            a.sortOrder - b.sortOrder,
        )
        .map((image) => ({
          ...image,
          url: publicImageUrl(image.url) ?? image.url,
        }));
      const variant = item.variantId
        ? (variantMap.get(item.variantId) ?? null)
        : null;
      return {
        ...item,
        product: product ? { ...product, images } : null,
        variant,
      };
    });

    return { cart, items: enriched };
  } catch {
    return { cart: null, items: [] };
  }
}

export async function addToCart(input: {
  productId: string;
  variantId?: string;
  quantity?: number;
}) {
  const qty = Math.max(1, input.quantity ?? 1);
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, input.productId), eq(products.status, "active")),
  });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  let unitPrice = Number(product.price);
  if (input.variantId) {
    const variant = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, input.variantId),
    });
    if (!variant || !variant.isActive) throw new Error("VARIANT_NOT_FOUND");
    if (variant.price) unitPrice = Number(variant.price);
  }

  const cart = await getOrCreateCartId();
  const existing = await db.query.cartItems.findFirst({
    where: and(
      eq(cartItems.cartId, cart.id),
      eq(cartItems.productId, input.productId),
      input.variantId
        ? eq(cartItems.variantId, input.variantId)
        : isNull(cartItems.variantId),
    ),
  });

  if (existing) {
    await db
      .update(cartItems)
      .set({
        quantity: existing.quantity + qty,
        unitPrice: String(unitPrice),
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id,
      productId: input.productId,
      variantId: input.variantId,
      quantity: qty,
      unitPrice: String(unitPrice),
    });
  }

  // Avoid revalidatePath here — storefront is dynamic; skip extra work on add.
  return { ok: true as const };
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  const cart = await getOrCreateCartId();
  if (quantity <= 0) {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
  } else {
    await db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
  }
  return getCart();
}

export async function removeCartItem(itemId: string) {
  const cart = await getOrCreateCartId();
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
  return getCart();
}

export async function applyCoupon(code: string) {
  const cart = await getOrCreateCartId();
  const coupon = await db.query.coupons.findFirst({
    where: and(eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true)),
  });
  if (!coupon) throw new Error("INVALID_COUPON");
  await db
    .update(carts)
    .set({ couponCode: coupon.code, updatedAt: new Date() })
    .where(eq(carts.id, cart.id));
  return getCheckoutBundle();
}

function computeTotals(
  cart: NonNullable<Awaited<ReturnType<typeof getCart>>["cart"]>,
  items: Awaited<ReturnType<typeof getCart>>["items"],
  shippingPrice: number,
  freeAbove: number | null,
  coupon:
    | {
        type: string;
        value: string;
        maxDiscount: string | null;
      }
    | null
    | undefined,
) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );

  let discount = 0;
  if (coupon) {
    if (coupon.type === "percent") {
      discount = (subtotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
    } else {
      discount = Number(coupon.value);
    }
  }

  let shipping = shippingPrice;
  if (freeAbove != null && subtotal - discount >= freeAbove) {
    shipping = 0;
  }

  const taxable = Math.max(0, subtotal - discount);
  const tax = 0;
  const grandTotal = taxable + shipping + tax;

  return {
    subtotal,
    discount,
    shipping,
    tax,
    grandTotal,
    currency: cart.currency,
    couponCode: cart.couponCode,
  };
}

export async function getCartTotals() {
  const bundle = await getCheckoutBundle();
  return bundle.totals;
}

/** Single round-trip for checkout / summary UIs. */
export async function getCheckoutBundle() {
  const { cart, items } = await getCart();
  if (!cart) {
    return {
      cart: null,
      items: [],
      totals: {
        subtotal: 0,
        discount: 0,
        shipping: 0,
        tax: 0,
        grandTotal: 0,
        currency: "TRY",
        couponCode: null as string | null,
      },
    };
  }

  const [coupon, methods] = await Promise.all([
    cart.couponCode
      ? db.query.coupons.findFirst({ where: eq(coupons.code, cart.couponCode) })
      : Promise.resolve(null),
    db.query.shippingMethods.findMany({
      where: eq(shippingMethods.isActive, true),
    }),
  ]);

  const method = methods[0];
  const totals = computeTotals(
    cart,
    items,
    method ? Number(method.price) : 0,
    method?.freeAbove ? Number(method.freeAbove) : null,
    coupon,
  );

  return { cart, items, totals };
}

const checkoutSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  phone: z.string().min(7),
  line1: z.string().min(3),
  city: z.string().min(2),
  district: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("CY"),
  paymentMethod: z.string().default("mock_card"),
  customerNote: z.string().optional(),
});

export async function placeOrder(raw: z.infer<typeof checkoutSchema>) {
  const data = checkoutSchema.parse(raw);
  const { cart, items } = await getCart();
  if (!cart || items.length === 0) throw new Error("EMPTY_CART");

  for (const item of items) {
    if ((item.product?.stock ?? 0) < item.quantity) {
      throw new Error("INSUFFICIENT_STOCK");
    }
  }

  const [coupon, methods] = await Promise.all([
    cart.couponCode
      ? db.query.coupons.findFirst({ where: eq(coupons.code, cart.couponCode) })
      : Promise.resolve(null),
    db.query.shippingMethods.findMany({
      where: eq(shippingMethods.isActive, true),
    }),
  ]);
  const method = methods[0];
  const totals = computeTotals(
    cart,
    items,
    method ? Number(method.price) : 0,
    method?.freeAbove ? Number(method.freeAbove) : null,
    coupon,
  );
  const { orders, orderItems, orderStatusHistory } = await import(
    "@/lib/db/schema"
  );

  const orderNumber = `BV${Date.now().toString().slice(-10)}`;
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      status: "awaiting_payment",
      paymentStatus: "pending",
      paymentMethod: data.paymentMethod,
      currency: totals.currency,
      subtotal: String(totals.subtotal),
      discountTotal: String(totals.discount),
      shippingTotal: String(totals.shipping),
      taxTotal: String(totals.tax),
      grandTotal: String(totals.grandTotal),
      couponCode: totals.couponCode,
      guestEmail: data.email,
      customerNote: data.customerNote,
      shippingAddress: {
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        city: data.city,
        district: data.district ?? "",
        postalCode: data.postalCode ?? "",
        country: data.country,
      },
    })
    .returning();

  await db.insert(orderItems).values(
    items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product?.name ?? "Ürün",
      sku: item.product?.sku,
      variantName: item.variant?.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: String(Number(item.unitPrice) * item.quantity),
    })),
  );

  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    toStatus: "awaiting_payment",
    note: "Sipariş oluşturuldu",
  });

  const { getPaymentProvider } = await import("@/lib/payments");
  const payment = getPaymentProvider();
  const result = await payment.charge({
    amount: totals.grandTotal,
    currency: totals.currency,
    orderId: order.id,
    description: `Order ${orderNumber}`,
  });

  if (result.success) {
    for (const item of items) {
      await applyStockChange({
        productId: item.productId,
        delta: -item.quantity,
        type: "sale",
        note: item.variant?.name ? `Satış · ${item.variant.name}` : "Satış",
        reference: orderNumber,
      });
    }
    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        status: "preparing",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: "awaiting_payment",
      toStatus: "preparing",
      note: "Ödeme alındı (mock)",
    });
  }

  await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
  await db
    .update(carts)
    .set({ couponCode: null, updatedAt: new Date() })
    .where(eq(carts.id, cart.id));

  revalidatePath("/admin/orders");
  return { orderId: order.id, orderNumber, payment: result };
}
