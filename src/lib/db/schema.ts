import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "inactive",
  "archived",
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "in",
  "out",
  "adjust",
  "sale",
  "return",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "new",
  "awaiting_payment",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);

export const campaignTypeEnum = pgEnum("campaign_type", [
  "percent",
  "fixed",
  "product",
  "category",
  "brand",
  "buy_x_get_y",
  "free_shipping",
  "coupon",
]);

export const announcementTypeEnum = pgEnum("announcement_type", [
  "top_bar",
  "popup",
  "homepage_banner",
  "campaign_banner",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const invoiceTypeEnum = pgEnum("invoice_type", [
  "invoice",
  "receipt",
  "proforma",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "cancelled",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  ...timestamps,
});

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  ...timestamps,
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    /** Unused when Supabase Auth owns passwords; kept nullable for legacy rows. */
    passwordHash: text("password_hash"),
    name: varchar("name", { length: 160 }).notNull(),
    roleId: uuid("role_id").references(() => roles.id),
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash"),
    firstName: varchar("first_name", { length: 120 }),
    lastName: varchar("last_name", { length: 120 }),
    phone: varchar("phone", { length: 40 }),
    accountType: varchar("account_type", { length: 32 }).default("individual").notNull(),
    companyName: varchar("company_name", { length: 200 }),
    companyTitle: varchar("company_title", { length: 200 }),
    taxOffice: varchar("tax_office", { length: 120 }),
    taxNumber: varchar("tax_number", { length: 32 }),
    segment: varchar("segment", { length: 64 }).default("new"),
    totalSpent: numeric("total_spent", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    orderCount: integer("order_count").default(0).notNull(),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("customers_email_idx").on(t.email)],
);

export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 80 }),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  line1: varchar("line1", { length: 255 }).notNull(),
  line2: varchar("line2", { length: 255 }),
  city: varchar("city", { length: 120 }).notNull(),
  district: varchar("district", { length: 120 }),
  country: varchar("country", { length: 2 }).default("CY").notNull(),
  postalCode: varchar("postal_code", { length: 20 }),
  isDefault: boolean("is_default").default(false).notNull(),
  ...timestamps,
});

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    isActive: boolean("is_active").default(true).notNull(),
    seoTitle: varchar("seo_title", { length: 180 }),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (t) => [uniqueIndex("brands_slug_idx").on(t.slug)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: uuid("parent_id"),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    bannerUrl: text("banner_url"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    seoTitle: varchar("seo_title", { length: 180 }),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("categories_slug_idx").on(t.slug),
    index("categories_parent_idx").on(t.parentId),
  ],
);

export const attributes = pgTable("attributes", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  type: varchar("type", { length: 32 }).default("select").notNull(),
  unit: varchar("unit", { length: 32 }),
  ...timestamps,
});

export const attributeValues = pgTable(
  "attribute_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attributes.id, { onDelete: "cascade" }),
    value: varchar("value", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("attribute_values_attr_idx").on(t.attributeId)],
);

export const categoryFilters = pgTable(
  "category_filters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attributes.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => [
    uniqueIndex("category_filters_unique_idx").on(t.categoryId, t.attributeId),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 280 }).notNull(),
    sku: varchar("sku", { length: 64 }).notNull(),
    barcode: varchar("barcode", { length: 64 }),
    categoryId: uuid("category_id").references(() => categories.id),
    brandId: uuid("brand_id").references(() => brands.id),
    shortDescription: text("short_description"),
    description: text("description"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
    stock: integer("stock").default(0).notNull(),
    minStock: integer("min_stock").default(5).notNull(),
    maxStock: integer("max_stock"),
    status: productStatusEnum("status").default("draft").notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    isNew: boolean("is_new").default(false).notNull(),
    isCampaign: boolean("is_campaign").default(false).notNull(),
    tags: jsonb("tags").$type<string[]>().default([]),
    specs: jsonb("specs").$type<Record<string, string>>().default({}),
    technicalSpecs:
      jsonb("technical_specs").$type<Record<string, string>>().default({}),
    videoUrl: text("video_url"),
    seoTitle: varchar("seo_title", { length: 180 }),
    seoDescription: text("seo_description"),
    seoKeywords: text("seo_keywords"),
    viewCount: integer("view_count").default(0).notNull(),
    soldCount: integer("sold_count").default(0).notNull(),
    searchVector: text("search_vector"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    uniqueIndex("products_sku_idx").on(t.sku),
    index("products_category_idx").on(t.categoryId),
    index("products_brand_idx").on(t.brandId),
    index("products_status_idx").on(t.status),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    sku: varchar("sku", { length: 64 }).notNull(),
    barcode: varchar("barcode", { length: 64 }),
    price: numeric("price", { precision: 12, scale: 2 }),
    compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
    stock: integer("stock").default(0).notNull(),
    imageUrl: text("image_url"),
    options: jsonb("options").$type<Record<string, string>>().default({}),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("product_variants_sku_idx").on(t.sku),
    index("product_variants_product_idx").on(t.productId),
  ],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    type: stockMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    stockBefore: integer("stock_before").notNull(),
    stockAfter: integer("stock_after").notNull(),
    note: text("note"),
    reference: varchar("reference", { length: 80 }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("stock_movements_product_idx").on(t.productId),
    index("stock_movements_created_idx").on(t.createdAt),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: varchar("alt", { length: 255 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productAttributeValues = pgTable(
  "product_attribute_values",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attributes.id, { onDelete: "cascade" }),
    attributeValueId: uuid("attribute_value_id").references(
      () => attributeValues.id,
      { onDelete: "set null" },
    ),
    valueText: varchar("value_text", { length: 255 }),
  },
  (t) => [
    primaryKey({
      columns: [t.productId, t.attributeId],
    }),
  ],
);

export const media = pgTable("media", {
  id: uuid("id").defaultRandom().primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mime_type", { length: 120 }),
  size: integer("size").default(0),
  width: integer("width"),
  height: integer("height"),
  folder: varchar("folder", { length: 120 }).default("general"),
  alt: varchar("alt", { length: 255 }),
  isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
  ...timestamps,
});

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),
  sessionId: varchar("session_id", { length: 128 }),
  couponCode: varchar("coupon_code", { length: 64 }),
  currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
  ...timestamps,
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    quantity: integer("quantity").default(1).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    ...timestamps,
  },
  (t) => [index("cart_items_cart_idx").on(t.cartId)],
);

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "cascade",
    }),
    sessionId: varchar("session_id", { length: 128 }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("favorites_product_idx").on(t.productId)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: varchar("order_number", { length: 32 }).notNull(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    status: orderStatusEnum("status").default("new").notNull(),
    paymentStatus: paymentStatusEnum("payment_status")
      .default("pending")
      .notNull(),
    paymentMethod: varchar("payment_method", { length: 64 }),
    currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    discountTotal: numeric("discount_total", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    shippingTotal: numeric("shipping_total", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    taxTotal: numeric("tax_total", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
    couponCode: varchar("coupon_code", { length: 64 }),
    shippingCarrier: varchar("shipping_carrier", { length: 80 }),
    trackingNumber: varchar("tracking_number", { length: 120 }),
    customerNote: text("customer_note"),
    adminNote: text("admin_note"),
    shippingAddress: jsonb("shipping_address").$type<Record<string, string>>(),
    billingAddress: jsonb("billing_address").$type<Record<string, string>>(),
    guestEmail: varchar("guest_email", { length: 255 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.orderNumber),
    index("orders_status_idx").on(t.status),
    index("orders_customer_idx").on(t.customerId),
  ],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "set null",
  }),
  productName: varchar("product_name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 64 }),
  variantName: varchar("variant_name", { length: 160 }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
});

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  note: text("note"),
  changedBy: uuid("changed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceNumber: varchar("invoice_number", { length: 40 }).notNull(),
    type: invoiceTypeEnum("type").default("invoice").notNull(),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
    issueDate: timestamp("issue_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    sellerName: varchar("seller_name", { length: 200 }).notNull(),
    sellerTaxOffice: varchar("seller_tax_office", { length: 120 }),
    sellerTaxNumber: varchar("seller_tax_number", { length: 40 }),
    sellerAddress: text("seller_address"),
    sellerPhone: varchar("seller_phone", { length: 40 }),
    sellerEmail: varchar("seller_email", { length: 255 }),
    buyerName: varchar("buyer_name", { length: 200 }).notNull(),
    buyerTaxOffice: varchar("buyer_tax_office", { length: 120 }),
    buyerTaxNumber: varchar("buyer_tax_number", { length: 40 }),
    buyerAddress: text("buyer_address"),
    buyerPhone: varchar("buyer_phone", { length: 40 }),
    buyerEmail: varchar("buyer_email", { length: 255 }),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    discountTotal: numeric("discount_total", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    taxTotal: numeric("tax_total", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    grandTotal: numeric("grand_total", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    notes: text("notes"),
    paymentMethod: varchar("payment_method", { length: 64 }),
    paymentStatus: varchar("payment_status", { length: 32 }).default("unpaid"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("invoices_number_idx").on(t.invoiceNumber),
    index("invoices_status_idx").on(t.status),
    index("invoices_type_idx").on(t.type),
    index("invoices_order_idx").on(t.orderId),
    index("invoices_customer_idx").on(t.customerId),
  ],
);

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  description: varchar("description", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 64 }),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0").notNull(),
  lineSubtotal: numeric("line_subtotal", { precision: 12, scale: 2 }).notNull(),
  lineTax: numeric("line_tax", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    type: campaignTypeEnum("type").notNull(),
    description: text("description"),
    shortDescription: text("short_description"),
    cta: varchar("cta", { length: 120 }),
    value: numeric("value", { precision: 12, scale: 2 }),
    minCartAmount: numeric("min_cart_amount", { precision: 12, scale: 2 }),
    priority: integer("priority").default(0).notNull(),
    status: contentStatusEnum("status").default("draft").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    conditions: jsonb("conditions").$type<Record<string, unknown>>().default({}),
    seoTitle: varchar("seo_title", { length: 180 }),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (t) => [uniqueIndex("campaigns_slug_idx").on(t.slug)],
);

export const campaignTargets = pgTable("campaign_targets", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  targetType: varchar("target_type", { length: 32 }).notNull(),
  targetId: uuid("target_id").notNull(),
});

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    value: numeric("value", { precision: 12, scale: 2 }).notNull(),
    minCartAmount: numeric("min_cart_amount", { precision: 12, scale: 2 }),
    maxDiscount: numeric("max_discount", { precision: 12, scale: 2 }),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").default(0).notNull(),
    perUserLimit: integer("per_user_limit").default(1),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    productIds: jsonb("product_ids").$type<string[]>().default([]),
    categoryIds: jsonb("category_ids").$type<string[]>().default([]),
    ...timestamps,
  },
  (t) => [uniqueIndex("coupons_code_idx").on(t.code)],
);

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  couponId: uuid("coupon_id")
    .notNull()
    .references(() => coupons.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id),
  orderId: uuid("order_id").references(() => orders.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  cta: varchar("cta", { length: 120 }),
  type: announcementTypeEnum("type").default("top_bar").notNull(),
  priority: integer("priority").default(0).notNull(),
  status: contentStatusEnum("status").default("draft").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  ...timestamps,
});

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    content: text("content"),
    status: contentStatusEnum("status").default("draft").notNull(),
    seoTitle: varchar("seo_title", { length: 180 }),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("pages_slug_idx").on(t.slug)],
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 220 }).notNull(),
    slug: varchar("slug", { length: 240 }).notNull(),
    excerpt: text("excerpt"),
    content: text("content"),
    featuredImage: text("featured_image"),
    category: varchar("category", { length: 120 }),
    tags: jsonb("tags").$type<string[]>().default([]),
    status: contentStatusEnum("status").default("draft").notNull(),
    seoTitle: varchar("seo_title", { length: 180 }),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("blog_posts_slug_idx").on(t.slug)],
);

export const menus = pgTable("menus", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  ...timestamps,
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    label: varchar("label", { length: 160 }).notNull(),
    href: varchar("href", { length: 255 }),
    categoryId: uuid("category_id").references(() => categories.id),
    bannerUrl: text("banner_url"),
    featured: boolean("featured").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => [index("menu_items_menu_idx").on(t.menuId)],
);

export const homepageSections = pgTable("homepage_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 200 }),
  subtitle: text("subtitle"),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  sortOrder: integer("sort_order").default(0).notNull(),
  status: contentStatusEnum("status").default("published").notNull(),
  ...timestamps,
});

export const homepageSectionItems = pgTable("homepage_section_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => homepageSections.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }),
  subtitle: text("subtitle"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  buttonLabel: varchar("button_label", { length: 80 }),
  productId: uuid("product_id").references(() => products.id),
  sortOrder: integer("sort_order").default(0).notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id),
  authorName: varchar("author_name", { length: 120 }),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 180 }),
  body: text("body"),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  ...timestamps,
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: varchar("entity_id", { length: 80 }),
  before: jsonb("before"),
  after: jsonb("after"),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiPrompts = pgTable(
  "ai_prompts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    prompt: text("prompt").notNull(),
    version: integer("version").default(1).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("ai_prompts_code_version_idx").on(t.code, t.version)],
);

export const aiGenerations = pgTable("ai_generations", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: varchar("type", { length: 64 }).notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  model: varchar("model", { length: 120 }),
  promptCode: varchar("prompt_code", { length: 80 }),
  input: jsonb("input"),
  output: jsonb("output"),
  status: varchar("status", { length: 32 }).default("completed").notNull(),
  mediaId: uuid("media_id").references(() => media.id),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 120 }).notNull(),
    value: jsonb("value").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("settings_key_idx").on(t.key)],
);

export const translations = pgTable(
  "translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    field: varchar("field", { length: 80 }).notNull(),
    locale: varchar("locale", { length: 8 }).notNull(),
    value: text("value").notNull(),
  },
  (t) => [
    uniqueIndex("translations_unique_idx").on(
      t.entityType,
      t.entityId,
      t.field,
      t.locale,
    ),
  ],
);

export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromPath: varchar("from_path", { length: 255 }).notNull(),
    toPath: varchar("to_path", { length: 255 }).notNull(),
    statusCode: integer("status_code").default(301).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("redirects_from_idx").on(t.fromPath)],
);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  isRead: boolean("is_read").default(false).notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("newsletter_email_idx").on(t.email)],
);

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  subject: varchar("subject", { length: 200 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 32 }).default("new").notNull(),
  ...timestamps,
});

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    event: varchar("event", { length: 80 }).notNull(),
    path: varchar("path", { length: 255 }),
    productId: uuid("product_id"),
    sessionId: varchar("session_id", { length: 128 }),
    customerId: uuid("customer_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("analytics_event_idx").on(t.event),
    index("analytics_created_idx").on(t.createdAt),
  ],
);

export const shippingMethods = pgTable("shipping_methods", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  carrier: varchar("carrier", { length: 80 }).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  freeAbove: numeric("free_above", { precision: 12, scale: 2 }),
  etaDaysMin: integer("eta_days_min").default(1),
  etaDaysMax: integer("eta_days_max").default(3),
  regions: jsonb("regions").$type<string[]>().default(["CY"]),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
});

/* Relations (selected) */
export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  variants: many(productVariants),
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
  products: many(products),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));
