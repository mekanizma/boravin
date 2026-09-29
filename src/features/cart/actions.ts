"use server";

import { and, eq, isNull } from "drizzle-orm";
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

export async function getCart() {
  try {
    const cart = await getOrCreateCartId();
    const items = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, cart.id),
    });

    const enriched = await Promise.all(
      items.map(async (item) => {
        const product = await db.query.products.findFirst({
          where: eq(products.id, item.productId),
        });
        const images = product
          ? (
              await db
                .select()
                .from(productImages)
                .where(eq(productImages.productId, product.id))
            ).sort(
              (a, b) =>
                Number(b.isPrimary) - Number(a.isPrimary) ||
                a.sortOrder - b.sortOrder,
            )
          : [];
        const variant = item.variantId
          ? await db.query.productVariants.findFirst({
              where: eq(productVariants.id, item.variantId),
            })
          : null;
        return {
          ...item,
          product: product ? { ...product, images } : null,
          variant,
        };
      }),
    );

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

  revalidatePath("/sepet");
  return getCart();
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
  revalidatePath("/sepet");
  return getCart();
}

export async function removeCartItem(itemId: string) {
  const cart = await getOrCreateCartId();
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
  revalidatePath("/sepet");
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
  revalidatePath("/sepet");
  return getCartTotals();
}

export async function getCartTotals() {
  const { cart, items } = await getCart();
  if (!cart) {
    return {
      subtotal: 0,
      discount: 0,
      shipping: 0,
      tax: 0,
      grandTotal: 0,
      currency: "TRY",
    };
  }

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );

  let discount = 0;
  if (cart.couponCode) {
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, cart.couponCode),
    });
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
  }

  const methods = await db.query.shippingMethods.findMany({
    where: eq(shippingMethods.isActive, true),
  });
  const method = methods[0];
  let shipping = method ? Number(method.price) : 0;
  if (method?.freeAbove && subtotal - discount >= Number(method.freeAbove)) {
    shipping = 0;
  }

  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * 0.0;
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

  const totals = await getCartTotals();
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

  // Mock payment success
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
