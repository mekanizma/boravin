import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
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

/** WhatsApp siparişlerinde adres + iletişim her zaman zorunlu. */
export const createOrderSchema = z.object({
  fulfillment: z.enum(["delivery", "pickup"]).default("delivery"),
  customer: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, "Müşteriden ad soyad isteyin (en az 2 karakter)."),
    phone: z
      .string()
      .trim()
      .min(7, "Müşteriden telefon numarası isteyin."),
    email: z
      .union([z.string().email(), z.literal("")])
      .optional()
      .transform((v) => (v && v.trim() ? v.trim().toLowerCase() : undefined)),
    line1: z
      .string()
      .trim()
      .min(3, "Müşteriden açık adres isteyin (cadde/sokak, no)."),
    line2: z.string().optional(),
    city: z
      .string()
      .trim()
      .min(2, "Müşteriden şehir / bölge isteyin (örn. Girne)."),
    district: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().default("CY"),
  }),
  items: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(100),
        options: z.record(z.string(), z.string()).optional(),
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
type ResolvedLine = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

type ResolveError = {
  error: "PRODUCT_NOT_FOUND" | "INSUFFICIENT_STOCK";
  sku: string;
  available?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function readQuantity(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** Accept common Waai / flat payloads before Zod validation. */
export function normalizeWaaiOrderPayload(raw: unknown): unknown {
  let root = asRecord(raw);
  if (!root) return raw;

  // Some clients wrap the body: { data: {...} } or { order: {...} }
  const nested = asRecord(root.data) ?? asRecord(root.order) ?? asRecord(root.payload);
  if (nested && (nested.customer || nested.items || nested.fullName || nested.name)) {
    root = { ...nested, ...root, customer: nested.customer ?? root.customer };
  }

  const customerIn = asRecord(root.customer) ?? root;
  const fullName = readString(
    customerIn.fullName,
    customerIn.name,
    customerIn.customerName,
    root.fullName,
    root.name,
  );
  const phone = readString(
    customerIn.phone,
    customerIn.phoneNumber,
    customerIn.tel,
    root.phone,
    root.phoneNumber,
  );
  const email = readString(customerIn.email, root.email);
  const line1 = readString(
    customerIn.line1,
    customerIn.address,
    customerIn.addressLine1,
    customerIn.street,
    root.line1,
    root.address,
  );
  const line2 = readString(customerIn.line2, customerIn.addressLine2);
  const city = readString(customerIn.city, customerIn.town, root.city);
  const district = readString(customerIn.district, customerIn.region);
  const postalCode = readString(customerIn.postalCode, customerIn.zip);
  const country = readString(customerIn.country, root.country) ?? "CY";

  const fulfillmentRaw = readString(
    root.fulfillment,
    root.deliveryType,
    root.shippingType,
  )?.toLowerCase();
  const noteHint = readString(root.customerNote, root.note)?.toLowerCase() ?? "";
  const pickupHint =
    fulfillmentRaw === "pickup" ||
    fulfillmentRaw === "magaza" ||
    fulfillmentRaw === "mağaza" ||
    fulfillmentRaw === "store" ||
    noteHint.includes("mağaza") ||
    noteHint.includes("magaza") ||
    noteHint.includes("pickup") ||
    noteHint.includes("teslim al");

  const itemsRaw = Array.isArray(root.items)
    ? root.items
    : Array.isArray(root.products)
      ? root.products
      : null;

  const items =
    itemsRaw?.map((item) => {
      const row = asRecord(item) ?? {};
      const sku =
        readString(row.sku, row.productSku, row.variantSku, row.name, row.productName) ??
        "";
      const optionsRaw = asRecord(row.options) ?? asRecord(row.variantOptions);
      const options: Record<string, string> | undefined = optionsRaw
        ? Object.fromEntries(
            Object.entries(optionsRaw)
              .map(([k, v]) => [k, readString(v) ?? ""])
              .filter(([, v]) => v.length > 0),
          )
        : undefined;
      // Flat shortcuts: color/renk, storage/depolama
      const renk = readString(row.renk, row.color, row.Colour);
      const depolama = readString(row.depolama, row.storage, row.kapasite);
      const mergedOptions = {
        ...(options ?? {}),
        ...(renk ? { renk } : {}),
        ...(depolama ? { depolama } : {}),
      };
      return {
        sku,
        quantity: readQuantity(row.quantity ?? row.qty),
        ...(Object.keys(mergedOptions).length > 0
          ? { options: mergedOptions }
          : {}),
      };
    }) ?? undefined;

  // Single-item shortcuts from Waai tools
  const singleSku = readString(
    root.sku,
    root.productSku,
    root.productName,
    root.product,
  );
  const normalizedItems =
    items && items.length > 0
      ? items
      : singleSku
        ? [{ sku: singleSku, quantity: readQuantity(root.quantity ?? root.qty) }]
        : undefined;

  let fulfillment: "delivery" | "pickup" = "delivery";
  if (
    fulfillmentRaw === "pickup" ||
    fulfillmentRaw === "magaza" ||
    fulfillmentRaw === "mağaza" ||
    fulfillmentRaw === "store" ||
    pickupHint
  ) {
    fulfillment = "pickup";
  }

  return {
    fulfillment,
    customer: {
      fullName: fullName ?? "",
      phone: phone ?? "",
      ...(email ? { email } : {}),
      line1: line1 ?? "",
      ...(line2 ? { line2 } : {}),
      city: city ?? "",
      ...(district ? { district } : {}),
      ...(postalCode ? { postalCode } : {}),
      country,
    },
    ...(normalizedItems ? { items: normalizedItems } : {}),
    paymentMethod: root.paymentMethod ?? "whatsapp",
    ...(readString(root.customerNote, root.note)
      ? { customerNote: readString(root.customerNote, root.note) }
      : {}),
    ...(typeof root.markPaid === "boolean" ? { markPaid: root.markPaid } : {}),
  };
}

async function resolveProductByIdentity(normalized: string) {
  return db.query.products.findFirst({
    where: and(
      eq(products.status, "active"),
      or(
        eq(products.sku, normalized),
        eq(products.barcode, normalized),
        eq(products.slug, normalized),
      ),
    ),
  });
}

async function resolveProductByName(normalized: string) {
  const exact = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, "active"),
        sql`lower(${products.name}) = lower(${normalized})`,
      ),
    )
    .limit(2);

  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;

  const pattern = `%${normalized}%`;
  const fuzzy = await db
    .select()
    .from(products)
    .where(and(eq(products.status, "active"), ilike(products.name, pattern)))
    .orderBy(desc(products.soldCount), desc(products.isFeatured))
    .limit(5);

  if (fuzzy.length === 1) return fuzzy[0];

  // Prefer the shortest name that still contains the query (e.g. "iPhone 16 Pro"
  // over "iPhone 16 Pro Max" when both match).
  const ranked = fuzzy
    .map((row) => ({
      row,
      score: Math.abs(row.name.length - normalized.length),
    }))
    .sort((a, b) => a.score - b.score);

  if (
    ranked.length >= 2 &&
    ranked[0] &&
    ranked[1] &&
    ranked[0].score < ranked[1].score
  ) {
    return ranked[0].row;
  }

  return ranked[0]?.row ?? null;
}

async function resolveFromProduct(
  product: typeof products.$inferSelect,
  quantity: number,
  requestedSku: string,
  preferredOptions?: Record<string, string>,
): Promise<ResolvedLine | ResolveError> {
  const variants = await db.query.productVariants.findMany({
    where: and(
      eq(productVariants.productId, product.id),
      eq(productVariants.isActive, true),
    ),
  });

  if (variants.length > 0) {
    const optionEntries = Object.entries(preferredOptions ?? {}).filter(
      ([, v]) => v.trim().length > 0,
    );

    const matchByOptions =
      optionEntries.length > 0
        ? variants.find((v) => {
            const opts = v.options ?? {};
            return optionEntries.every(([key, value]) => {
              const actual =
                opts[key] ??
                opts[key.toLowerCase()] ??
                opts[key === "color" ? "renk" : key] ??
                opts[key === "storage" ? "depolama" : key];
              return (
                typeof actual === "string" &&
                actual.toLowerCase() === value.toLowerCase()
              );
            });
          })
        : undefined;

    const withStock =
      matchByOptions && matchByOptions.stock >= quantity
        ? matchByOptions
        : matchByOptions
          ? undefined
          : variants.find((v) => v.stock >= quantity);

    if (withStock) {
      const unitPrice =
        withStock.price != null ? Number(withStock.price) : Number(product.price);
      return {
        productId: product.id,
        variantId: withStock.id,
        productName: product.name,
        variantName: withStock.name,
        sku: withStock.sku,
        quantity,
        unitPrice,
        taxRate: Number(product.taxRate ?? 0),
      };
    }

    if (product.stock >= quantity) {
      return {
        productId: product.id,
        variantId: null,
        productName: product.name,
        variantName: null,
        sku: product.sku,
        quantity,
        unitPrice: Number(product.price),
        taxRate: Number(product.taxRate ?? 0),
      };
    }

    const available = Math.max(
      product.stock,
      ...variants.map((v) => v.stock),
    );
    return {
      error: "INSUFFICIENT_STOCK",
      sku: requestedSku,
      available,
    };
  }

  if (product.stock < quantity) {
    return {
      error: "INSUFFICIENT_STOCK",
      sku: requestedSku,
      available: product.stock,
    };
  }

  return {
    productId: product.id,
    variantId: null,
    productName: product.name,
    variantName: null,
    sku: product.sku,
    quantity,
    unitPrice: Number(product.price),
    taxRate: Number(product.taxRate ?? 0),
  };
}

async function resolveLine(
  sku: string,
  quantity: number,
  preferredOptions?: Record<string, string>,
): Promise<ResolvedLine | ResolveError> {
  const normalized = sku.trim();
  if (!normalized) return { error: "PRODUCT_NOT_FOUND", sku };

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
    if (!product) return { error: "PRODUCT_NOT_FOUND", sku };
    if (variant.stock < quantity) {
      return {
        error: "INSUFFICIENT_STOCK",
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

  const byIdentity = await resolveProductByIdentity(normalized);
  if (byIdentity) {
    return resolveFromProduct(byIdentity, quantity, sku, preferredOptions);
  }

  const byName = await resolveProductByName(normalized);
  if (byName) {
    return resolveFromProduct(byName, quantity, sku, preferredOptions);
  }

  return { error: "PRODUCT_NOT_FOUND", sku };
}

function pickShippingMethod(
  methods: Array<typeof shippingMethods.$inferSelect>,
  fulfillment: "delivery" | "pickup",
) {
  if (fulfillment === "pickup") {
    const pickup =
      methods.find((m) => /store|mağaza|magaza|pickup|teslim/i.test(m.name)) ??
      methods.find((m) => /store|pickup/i.test(m.carrier ?? "")) ??
      methods.find((m) => Number(m.price) === 0);
    return pickup ?? null;
  }
  return (
    methods.find((m) => !/store|mağaza|magaza|pickup/i.test(m.name)) ??
    methods[0] ??
    null
  );
}

export async function createWaaiOrder(raw: unknown) {
  const data = createOrderSchema.parse(normalizeWaaiOrderPayload(raw));
  const isPickup = data.fulfillment === "pickup";

  const resolved: ResolvedLine[] = [];
  for (const line of data.items) {
    const item = await resolveLine(line.sku, line.quantity, line.options);
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
  const method = pickShippingMethod(methods, data.fulfillment);
  let shippingTotal = 0;
  if (!isPickup && method) {
    const shippingPrice = Number(method.price);
    const freeAbove = method.freeAbove ? Number(method.freeAbove) : null;
    shippingTotal =
      freeAbove != null && subtotal >= freeAbove ? 0 : shippingPrice;
  }

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
    line2:
      data.customer.line2?.trim() ||
      (isPickup ? "Mağazadan teslim" : ""),
    city: data.customer.city.trim(),
    district: data.customer.district?.trim() ?? "",
    postalCode: data.customer.postalCode?.trim() ?? "",
    country: data.customer.country || "CY",
  };

  const defaultNote = isPickup
    ? "WhatsApp AI siparişi · Mağazadan teslim"
    : "WhatsApp AI siparişi";

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
          shippingCarrier: method?.carrier ?? (isPickup ? "Boravin Store" : null),
          guestEmail: data.customer.email?.trim().toLowerCase() ?? null,
          customerNote: data.customerNote?.trim() || defaultNote,
          adminNote: isPickup
            ? "Waai API · mağazadan teslim"
            : "Waai API üzerinden oluşturuldu",
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
        note: isPickup
          ? "Waai API siparişi oluşturuldu (mağazadan teslim)"
          : "Waai API siparişi oluşturuldu",
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
