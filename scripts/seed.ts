import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { STORE_CATEGORIES, type CatalogNode } from "../src/lib/storefront/catalog";
import {
  ROLE_PERMISSION_MAP,
  PERMISSIONS,
} from "../src/lib/auth/permissions";
import {
  announcements,
  aiPrompts,
  attributeValues,
  attributes,
  blogPosts,
  brands,
  campaignTargets,
  campaigns,
  categories,
  categoryFilters,
  coupons,
  customers,
  homepageSectionItems,
  homepageSections,
  menuItems,
  menus,
  orderItems,
  orderStatusHistory,
  orders,
  pages,
  permissions,
  productAttributeValues,
  productImages,
  productVariants,
  products,
  rolePermissions,
  roles,
  settings,
  shippingMethods,
  users,
} from "../src/lib/db/schema";
import { slugify } from "../src/lib/utils";
import {
  siteContact,
  siteContactAddress,
  siteContactPageHtml,
  siteContactSettingsValue,
} from "../src/lib/storefront/site-contact";

async function seed() {
  console.log("Seeding BORAVIN…");

  // Permissions & roles
  const permissionRows = [] as { id: string; code: string }[];
  for (const code of PERMISSIONS) {
    const [row] = await db
      .insert(permissions)
      .values({ code, name: code })
      .onConflictDoNothing()
      .returning();
    if (row) permissionRows.push(row);
    else {
      const existing = await db.query.permissions.findFirst({
        where: eq(permissions.code, code),
      });
      if (existing) permissionRows.push(existing);
    }
  }

  const roleIdByCode: Record<string, string> = {};
  for (const code of Object.keys(ROLE_PERMISSION_MAP)) {
    const [role] = await db
      .insert(roles)
      .values({ code, name: code.replaceAll("_", " ") })
      .onConflictDoNothing()
      .returning();
    const roleRow =
      role ??
      (await db.query.roles.findFirst({ where: eq(roles.code, code) }));
    if (!roleRow) continue;
    roleIdByCode[code] = roleRow.id;
    const permCodes = ROLE_PERMISSION_MAP[code as keyof typeof ROLE_PERMISSION_MAP];
    for (const pCode of permCodes) {
      const perm = permissionRows.find((p) => p.code === pCode);
      if (!perm) continue;
      await db
        .insert(rolePermissions)
        .values({ roleId: roleRow.id, permissionId: perm.id })
        .onConflictDoNothing();
    }
  }

  const passwordHash = await hash("Admin123!", 10);
  await db
    .insert(users)
    .values({
      email: "admin@boravin.com",
      name: "Boravin Admin",
      passwordHash,
      roleId: roleIdByCode.SUPER_ADMIN,
      isActive: true,
    })
    .onConflictDoNothing();

  // Link admin to Supabase Auth (same UUID as auth.users)
  try {
    const { getSupabaseAdmin } = await import("../src/lib/supabase/admin");
    const { isSupabaseConfigured } = await import("../src/lib/supabase/env");
    if (isSupabaseConfigured()) {
      const adminApi = getSupabaseAdmin();
      const staff = await db.query.users.findFirst({
        where: eq(users.email, "admin@boravin.com"),
      });
      if (staff) {
        const listed = await adminApi.auth.admin.listUsers({ page: 1, perPage: 200 });
        let authUser = listed.data.users.find(
          (u) => u.email?.toLowerCase() === "admin@boravin.com",
        );
        if (!authUser) {
          const created = await adminApi.auth.admin.createUser({
            email: "admin@boravin.com",
            password: "Admin123!",
            email_confirm: true,
            user_metadata: { name: "Boravin Admin", kind: "admin" },
            app_metadata: { kind: "admin", role: "SUPER_ADMIN" },
          });
          authUser = created.data.user ?? undefined;
        } else {
          await adminApi.auth.admin.updateUserById(authUser.id, {
            password: "Admin123!",
            email_confirm: true,
            app_metadata: { kind: "admin", role: "SUPER_ADMIN" },
            user_metadata: { name: "Boravin Admin", kind: "admin" },
          });
        }
        if (authUser && authUser.id !== staff.id) {
          await db.delete(users).where(eq(users.id, staff.id));
          await db.insert(users).values({
            id: authUser.id,
            email: "admin@boravin.com",
            name: "Boravin Admin",
            passwordHash: null,
            roleId: roleIdByCode.SUPER_ADMIN,
            isActive: true,
          });
        } else if (authUser) {
          await db
            .update(users)
            .set({ passwordHash: null, updatedAt: new Date() })
            .where(eq(users.id, staff.id));
        }
      }
    }
  } catch (error) {
    console.warn("Supabase Auth admin sync skipped:", error);
  }

  // Categories — names match https://www.boravin.com/
  const categoryIds: Record<string, string> = {};
  let sort = 0;
  async function insertCategory(node: CatalogNode, parentId?: string) {
    const [created] = await db
      .insert(categories)
      .values({
        parentId,
        name: node.name,
        slug: node.slug,
        sortOrder: sort++,
        isActive: true,
        description: `${node.name} kategorisi`,
      })
      .onConflictDoNothing()
      .returning();
    const row =
      created ??
      (await db.query.categories.findFirst({
        where: eq(categories.slug, node.slug),
      }));
    if (!row) return;
    if (row.name !== node.name) {
      await db
        .update(categories)
        .set({ name: node.name, parentId: parentId ?? null })
        .where(eq(categories.id, row.id));
    }
    categoryIds[node.slug] = row.id;
    for (const child of node.children) {
      await insertCategory(child, row.id);
    }
  }
  for (const cat of STORE_CATEGORIES) {
    await insertCategory(cat);
  }

  const brandNames = [
    "Apple", "Samsung", "Asus", "MSI", "Logitech", "Dyson", "Sony", "Xiaomi",
    "HP", "Dell", "JBL", "SteelSeries", "Cougar", "Epson", "Canon", "Lenovo",
  ];
  const brandIds: Record<string, string> = {};
  for (const name of brandNames) {
    const slug = slugify(name);
    const [row] = await db
      .insert(brands)
      .values({ name, slug, isActive: true })
      .onConflictDoNothing()
      .returning();
    const brand =
      row ??
      (await db.query.brands.findFirst({ where: eq(brands.slug, slug) }));
    if (brand) brandIds[slug] = brand.id;
  }

  // Attributes
  const attrDefs = [
  {
    code: "renk",
    name: "Renk",
      values: ["Siyah", "Beyaz", "Gri", "Mavi", "Kırmızı", "Yeşil"],
  },
  {
    code: "beden_olcu",
    name: "Beden / Ölçü",
    values: ["S", "M", "L", "XL", "One Size"],
  },
  {
    code: "hacim",
    name: "Hacim",
    unit: "L",
    values: ["0.5L", "1L", "1.5L", "2L"],
  },
  {
    code: "materyal",
    name: "Materyal",
    values: ["Plastik", "Alüminyum", "Çelik", "Karbon Fiber", "Silikon"],
  },
  {
    code: "baglanti",
    name: "Bağlantı",
      values: ["USB-C", "USB-A", "Bluetooth", "Wi-Fi", "HDMI", "3.5mm"],
  },
  {
    code: "ekran_boyutu",
    name: "Ekran Boyutu",
    unit: "inç",
    values: ["13.3", "14", "15.6", "16", "27", "32"],
  },
];
  const attrIds: Record<string, string> = {};
  const attrValueIds: Record<string, string> = {};
  for (const attr of attrDefs) {
    const [a] = await db
      .insert(attributes)
      .values({
        code: attr.code,
        name: attr.name,
        type: "select",
        unit: "unit" in attr ? attr.unit : undefined,
      })
      .onConflictDoNothing()
      .returning();
    const attrRow =
      a ??
      (await db.query.attributes.findFirst({
        where: eq(attributes.code, attr.code),
      }));
    if (!attrRow) continue;
    attrIds[attr.code] = attrRow.id;
    for (const [i, value] of attr.values.entries()) {
      const vSlug = slugify(value);
      const [v] = await db
      .insert(attributeValues)
        .values({
          attributeId: attrRow.id,
          value,
          slug: vSlug,
          sortOrder: i,
        })
      .returning();
      if (v) attrValueIds[`${attr.code}:${vSlug}`] = v.id;
    }
  }

  // category filters for phone, notebook, gaming accessories
  for (const catSlug of [
    "telefon",
    "bilgisayar-notebook",
    "cevre-birimleri",
    "bilgisayar",
  ]) {
    const catId =
      categoryIds[catSlug] ?? categoryIds.telefon ?? categoryIds.bilgisayar;
    if (!catId) continue;
    let i = 0;
    for (const code of [
      "renk",
      "ekran_boyutu",
      "baglanti",
      "materyal",
      "beden_olcu",
      "hacim",
    ]) {
      if (!attrIds[code]) continue;
      await db
        .insert(categoryFilters)
        .values({
          categoryId: catId,
          attributeId: attrIds[code],
          sortOrder: i++,
          isActive: true,
        })
        .onConflictDoNothing();
    }
  }

  // Products
  const productTemplates = [
    ["iPhone 16 Pro", "apple", "telefon", 73605],
    ["iPhone 15", "apple", "telefon", 36311],
    ["Samsung S26 Ultra", "samsung", "telefon", 53977],
    ["Galaxy Watch 7", "samsung", "telefon", 9814],
    ["MacBook Air M3", "apple", "bilgisayar", 54990],
    ["MacBook Pro 14", "apple", "bilgisayar", 89990],
    ["ASUS TUF A15", "asus", "bilgisayar", 53977],
    ["ASUS ROG Scar 18", "asus", "bilgisayar", 343490],
    ["MSI Thin GF63", "msi", "bilgisayar", 49070],
    ["MSI Katana 17", "msi", "bilgisayar", 98140],
    ["HP Victus 16", "hp", "bilgisayar", 80965],
    ["Dell Pro 16", "dell", "bilgisayar", 93233],
    ["Lenovo IdeaPad Slim 3", "lenovo", "bilgisayar", 44163],
    ["Sony PS5 Disc", "sony", "tuketici-elektronigi", 24990],
    ["Sony PS Portal", "sony", "tuketici-elektronigi", 12990],
    ["AirPods Pro 3", "apple", "cevre-birimleri", 16193],
    ["AirPods Max", "apple", "cevre-birimleri", 31895],
    ["JBL Bar 500", "jbl", "tuketici-elektronigi", 36802],
    ["Logitech G102", "logitech", "cevre-birimleri", 1324],
    ["Logitech G213", "logitech", "cevre-birimleri", 3434],
    ["SteelSeries Arctis Pro", "steelseries", "cevre-birimleri", 12022],
    ["Dyson V15s", "dyson", "ev-bakim", 44163],
    ["Dyson Airwrap", "dyson", "ev-bakim", 39256],
    ["Xiaomi Robot S40C", "xiaomi", "ev-bakim", 14721],
    ["Xiaomi Scooter Essential", "xiaomi", "tuketici-elektronigi", 14721],
    ["Epson L3250", "epson", "yazicilar", 10795],
    ["Canon Pixma", "canon", "yazicilar", 4990],
    ["Cougar Explore Jet", "cougar", "cevre-birimleri", 19628],
    ["Samsung QLED 65", "samsung", "tuketici-elektronigi", 39256],
    ["iPad Pro 13 M5", "apple", "bilgisayar", 78512],
  ] as const;

  const extra = Array.from({ length: 25 }, (_, i) => {
    const brandsCycle = ["asus", "msi", "samsung", "logitech", "xiaomi"] as const;
    const cats = ["bilgisayar", "telefon", "cevre-birimleri", "bilesenler"] as const;
    return [
      `Boravin Demo Ürün ${i + 1}`,
      brandsCycle[i % brandsCycle.length],
      cats[i % cats.length],
      1990 + i * 750,
    ] as const;
  });

  const allProducts = [...productTemplates, ...extra];
  const productIdList: string[] = [];

  /** Distinct Unsplash photos — one primary per product index (sig= alone does not change the image). */
  const PRODUCT_PHOTOS = [
    "1511707171634-5f897ff02aa9", // phone
    "1592899677977-9c10ca588bbd", // iphone
    "1610945415295-d9bbf067e59c", // samsung
    "1510557882401-a2ad210afa42", // phone desk
    "1517336714731-489689fd1ca8", // macbook
    "1496181133206-80ce9b88a853", // laptop
    "1593640408182-31c70c8268f5", // gaming desk
    "1603302576837-37561b2e2302", // gaming laptop
    "1611186871348-b1ce696e52c9", // macbook open
    "1525547719571-a2d4ac8828bb", // macbook side
    "1498050108023-c5249f4df085", // laptop workspace
    "1517694712202-14dd9538aa97", // coding laptop
    "1541807084-5c53f6a1afeb", // laptop flatlay
    "1531297481264-d3c98541d1ef", // laptop silver
    "1606813907291-d86efa9b94db", // console/controller
    "1493711662062-fa541adb3fc8", // gaming
    "1600294037681-c80b4cb5b434", // airpods
    "1505740420928-5e560c06d30e", // headphones
    "1484704849709-1afec988cab0", // headphones black
    "1546435770-a3e426bf472b", // headphones studio
    "1618366712010-f4ae9c647dcb", // headset
    "1606220588913-b3aacb4d2f46", // earbuds
    "1583394838336-acd977736f90", // headphones
    "1527814050087-3793815479db", // mouse
    "1558317374-067fb5f30001", // vacuum/home
    "1581578731548-c64695cc6952", // cleaning
    "1556911220-bff31c812dba", // kitchen/home
    "1584622650111-993a426fbf0a", // bathroom/home
    "1612815154858-60aa4f6f74e0", // printer/office
    "1454165804606-c3d57bc86b40", // office desk
    "1593359676535-895205650edc", // tv
    "1461156753357-655484dba035", // television
    "1550745165-9bc0b252726f", // retro tech
    "1511512578047-dfb9829680b0", // gaming setup
    "1591799264318-7e6ef8ddb7ea", // motherboard
    "1555617981-dac3880eac6c", // pc build
    "1518770660439-4636190af475", // circuits
    "1468495244123-6c6c332eeece", // gadgets flatlay
    "1542751371-adc38448a05e", // gaming rgb
    "1622297845775-5ff3fef71da6", // controller
    "1588872657578-7bffe1c7a14f", // laptop dark
    "1484781837692-c1f4bfc6e5f0", // laptop bed
    "1601784551446-20c9e07cdbdb", // phone
    "1580910051074-3eb694886605", // phone
    "1605236453806-6ff36851218e", // phone hand
    "1574944985070-8b9eb58b3c89", // smartphone
    "1563986768609-322da13575f3", // tech workspace
    "1586953208448-b95a79798f07", // printer paper
    "1558618666-fcd25c85cd64", // laundry/home
    "1563453392212-326f5e854473", // cleaning supplies
    "1626804475297-41608ea36aef", // laundry
    "1625948515291-69613efd103f", // keyboard
    "1695048133142-1a20484d2569", // phone close
    "1606144042614-b2417e99c4e3", // playstation
    "1574375929452-d0d077649290", // tv living
  ] as const;

  function productImageUrl(photoId: string, w = 800, h = 1000) {
    return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
  }

  function imagesForProduct(idx: number) {
    const primary = PRODUCT_PHOTOS[idx % PRODUCT_PHOTOS.length]!;
    const secondary =
      PRODUCT_PHOTOS[(idx + Math.ceil(PRODUCT_PHOTOS.length / 2)) % PRODUCT_PHOTOS.length]!;
    return {
      primary: productImageUrl(primary),
      secondary: productImageUrl(secondary),
    };
  }

  for (const [idx, [name, brandSlug, catSlug, price]] of allProducts.entries()) {
    const slug = slugify(`${name}-${idx + 1}`);
    const sku = `BV-MOCK-${1000 + idx}`;
    const compare = idx % 3 === 0 ? Math.round(price * 1.12) : null;
    const [row] = await db
      .insert(products)
      .values({
        name,
        slug,
        sku,
        barcode: `8690000${1000 + idx}`,
        brandId: brandIds[brandSlug],
        categoryId: categoryIds[catSlug] ?? categoryIds.bilgisayar,
        shortDescription: `${name} - BORAVIN seçkisi (MOCK)`,
        description: `${name} ürünü Kıbrıs'ta hızlı teslimat ve resmi garanti ile BORAVIN'de. MOCK veri.`,
        price: String(price),
        compareAtPrice: compare ? String(compare) : null,
        costPrice: String(Math.round(price * 0.78)),
        taxRate: "0",
        stock: 5 + (idx % 40),
        minStock: 5,
        status: "active",
        isFeatured: idx < 8,
        isNew: idx % 4 === 0,
        isCampaign: idx % 3 === 0,
        tags: ["mock", "boravin", brandSlug],
        seoTitle: `${name} | Boravin`,
        seoDescription: `${name} uygun fiyat ve stok bilgisiyle Boravin'de.`,
      })
      .onConflictDoNothing()
      .returning();

    const product =
      row ??
      (await db.query.products.findFirst({ where: eq(products.slug, slug) }));
    if (!product) continue;
    productIdList.push(product.id);

    const photos = imagesForProduct(idx);
    await db.delete(productImages).where(eq(productImages.productId, product.id));
    await db.insert(productImages).values([
      {
        productId: product.id,
        url: photos.primary,
        alt: name,
        sortOrder: 0,
        isPrimary: true,
      },
      {
        productId: product.id,
        url: photos.secondary,
        alt: `${name} alternatif`,
        sortOrder: 1,
        isPrimary: false,
      },
    ]);

    if (idx % 5 === 0) {
      await db
        .insert(productVariants)
        .values([
          {
            productId: product.id,
            name: "Siyah",
            sku: `${sku}-BLK`,
            stock: 10,
            price: String(price),
            options: { renk: "Siyah" },
          },
          {
            productId: product.id,
            name: "Beyaz",
            sku: `${sku}-WHT`,
            stock: 6,
            price: String(Math.round(price * 1.05)),
            options: { renk: "Beyaz" },
          },
        ])
        .onConflictDoNothing();
    }

    if (attrValueIds["renk:siyah"]) {
      await db
        .insert(productAttributeValues)
        .values({
          productId: product.id,
          attributeId: attrIds.renk,
          attributeValueId: attrValueIds["renk:siyah"],
        })
        .onConflictDoNothing();
    }
    if (attrValueIds["baglanti:usb-c"] && idx % 2 === 0) {
      await db
        .insert(productAttributeValues)
        .values({
          productId: product.id,
          attributeId: attrIds.baglanti,
          attributeValueId: attrValueIds["baglanti:usb-c"],
        })
        .onConflictDoNothing();
    }
    if (attrValueIds["ekran_boyutu:15-6"] && catSlug === "bilgisayar") {
      await db
        .insert(productAttributeValues)
        .values({
          productId: product.id,
          attributeId: attrIds.ekran_boyutu,
          attributeValueId: attrValueIds["ekran_boyutu:15-6"],
        })
        .onConflictDoNothing();
    }
  }

  // Customers & orders
  const customerIds: string[] = [];
  for (let i = 1; i <= 22; i++) {
    const [c] = await db
      .insert(customers)
      .values({
        email: `musteri${i}@example.com`,
        firstName: `Müşteri`,
        lastName: `${i}`,
        phone: `0533${1000000 + i}`,
        segment: i % 5 === 0 ? "high_spend" : i % 3 === 0 ? "returning" : "new",
        totalSpent: String(1000 * i),
        orderCount: i % 7,
      })
      .onConflictDoNothing()
      .returning();
    if (c) customerIds.push(c.id);
  }

  const statuses = [
    "new",
    "awaiting_payment",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
  ] as const;

  for (let i = 0; i < 32; i++) {
    const status = statuses[i % statuses.length];
    const productId = productIdList[i % productIdList.length];
    const unit = 1500 + i * 220;
    const qty = 1 + (i % 3);
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber: `BVSEED${1000 + i}`,
        customerId: customerIds[i % customerIds.length],
        status,
        paymentStatus: status === "cancelled" ? "failed" : status === "new" ? "pending" : "paid",
        paymentMethod: "mock_card",
        currency: "TRY",
        subtotal: String(unit * qty),
        discountTotal: String(i % 4 === 0 ? 100 : 0),
        shippingTotal: "75",
        taxTotal: "0",
        grandTotal: String(unit * qty + 75 - (i % 4 === 0 ? 100 : 0)),
        guestEmail: `musteri${(i % 22) + 1}@example.com`,
        shippingAddress: {
          fullName: `Müşteri ${i + 1}`,
          city: "Lefkoşa",
          line1: `Demo Cad. No:${i + 1}`,
          country: "CY",
        },
      })
      .returning();

    await db.insert(orderItems).values({
        orderId: order.id,
      productId,
      productName: `Seed ürün ${i + 1}`,
      sku: `BV-${1000 + (i % productIdList.length)}`,
      quantity: qty,
      unitPrice: String(unit),
      total: String(unit * qty),
    });

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
      toStatus: status,
      note: "Seed sipariş",
    });
  }

  // Campaigns & coupons
  const campaignDefs = [
    ["Yaz Teknoloji Günleri", "yaz-teknoloji", "percent", "20"],
    ["Gaming Haftası", "gaming-haftasi", "percent", "15"],
    ["Apple Festivali", "apple-festivali", "fixed", "1000"],
    ["Ücretsiz Kargo", "ucretsiz-kargo", "free_shipping", "0"],
    ["Dyson Fırsatları", "dyson-firsatlari", "product", "10"],
  ] as const;

  for (const [name, slug, type, value] of campaignDefs) {
    const [c] = await db
    .insert(campaigns)
      .values({
        name,
        slug,
        type,
        value,
        status: "published",
        shortDescription: `${name} kampanyası`,
        description: `${name} — BORAVIN özel fırsatları.`,
        cta: "Hemen keşfet",
        priority: 1,
        startsAt: new Date(Date.now() - 86400000),
        endsAt: new Date(Date.now() + 30 * 86400000),
      })
      .onConflictDoNothing()
    .returning();
    if (c && productIdList[0]) {
      await db.insert(campaignTargets).values({
        campaignId: c.id,
      targetType: "product",
        targetId: productIdList[0],
      });
    }
  }

  for (const [code, type, value] of [
    ["WELCOME10", "percent", "10"],
    ["BORAVIN100", "fixed", "100"],
    ["TECH20", "percent", "20"],
    ["FREESHIP", "fixed", "75"],
    ["VIP15", "percent", "15"],
  ] as const) {
    await db
      .insert(coupons)
      .values({
        code,
        type,
        value,
        usageLimit: 100,
      perUserLimit: 1,
      isActive: true,
        minCartAmount: "500",
        maxDiscount: type === "percent" ? "2000" : null,
        startsAt: new Date(Date.now() - 86400000),
        endsAt: new Date(Date.now() + 60 * 86400000),
      })
      .onConflictDoNothing();
  }

  const announcementTitles = [
    "Aynı gün kargo Lefkoşa",
    "Yeni iPhone stokta",
    "Gaming laptop indirimleri",
    "Ücretsiz montaj kampanyası",
    "Dyson bakım günleri",
    "2. el ürünler vitrinde",
    "Kurumsal faturalı satış",
    "Hafta sonu ekstra %5",
    "AirPods Pro 3 geldi",
    "PS5 stok güncellemesi",
  ];
  for (const [i, title] of announcementTitles.entries()) {
    await db.insert(announcements).values({
      title,
      description: `${title} — detaylar için mağazayı ziyaret edin.`,
      type: i % 2 === 0 ? "top_bar" : "homepage_banner",
      status: "published",
      priority: i,
      cta: "İncele",
      linkUrl: "/urunler",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 14 * 86400000),
    });
  }

  // Homepage (MOCK sections - clear with db:clear-mock)
  const homepageDefs = [
    {
      type: "hero",
      title: "Kıbrısın Teknoloji Merkezi",
      subtitle: "Seçilmiş elektronik. Net fiyat. Yerel teslimat.",
      sortOrder: 0,
      config: { ctaLabel: "Koleksiyonu aç", ctaHref: "/urunler", mock: true },
      items: [
        {
          title: "Flagship vitrin",
          imageUrl:
            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1600&h=2000&q=80",
          linkUrl: "/urunler",
          buttonLabel: "Ürünleri gör",
        },
      ],
    },
    {
      type: "categories",
      title: "Alışverişe nereden başlarsın?",
      subtitle: "Kategoriler",
      sortOrder: 1,
      items: [
        {
          title: "Bilgisayar",
          subtitle: "Notebook, AIO, tablet",
          linkUrl: "/kategori/bilgisayar",
          imageUrl:
            "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&h=1200&q=80",
        },
        {
          title: "Telefon",
          subtitle: "Flagship ve orta segment",
          linkUrl: "/kategori/telefon",
          imageUrl:
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&h=900&q=80",
        },
        {
          title: "Gaming",
          subtitle: "Konsol ve ekipman",
          linkUrl: "/urunler?q=gaming",
          imageUrl:
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&h=900&q=80",
        },
        {
          title: "Ev Bakım",
          subtitle: "Dyson ve akıllı cihazlar",
          linkUrl: "/kategori/ev-bakim",
          imageUrl:
            "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&h=900&q=80",
        },
      ],
    },
    {
      type: "products",
      title: "Öne çıkanlar",
      subtitle: "Editör seçkisi",
      sortOrder: 2,
      productIds: productIdList.slice(0, 8),
    },
    {
      type: "products",
      title: "Yeni gelenler",
      subtitle: "Bu hafta eklenenler",
      sortOrder: 3,
      productIds: productIdList.slice(8, 16),
    },
    {
      type: "campaign",
      title: "Yaz Teknoloji Günleri",
      subtitle: "Seçili ürünlerde yüzde 20'ye varan indirim",
      sortOrder: 4,
      config: { href: "/kampanya/yaz-teknoloji", mock: true },
      items: [
        {
          title: "Yaz Teknoloji Günleri",
          linkUrl: "/kampanya/yaz-teknoloji",
          imageUrl:
            "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=1400&h=900&q=80",
          buttonLabel: "Kampanyayı aç",
        },
      ],
    },
    {
      type: "brands",
      title: "Markalar",
      subtitle: "Güvenilir üreticiler",
      sortOrder: 5,
      items: brandNames.slice(0, 10).map((name, i) => ({
        title: name,
        linkUrl: `/marka/${slugify(name)}`,
        imageUrl: `https://picsum.photos/seed/bvbrand${i}/200/200`,
      })),
    },
    {
      type: "newsletter",
      title: "Stok ve kampanya haberleri",
      subtitle: "Sadece önemli duyurular",
      sortOrder: 6,
      items: [
        {
          title: "E-posta aboneliği",
          buttonLabel: "Kaydol",
          linkUrl: "/api/newsletter",
        },
      ],
    },
  ] as const;

  for (const section of homepageDefs) {
    const [row] = await db
      .insert(homepageSections)
      .values({
        type: section.type,
        title: section.title,
        subtitle: "subtitle" in section ? section.subtitle : undefined,
        sortOrder: section.sortOrder,
        status: "published",
        config: "config" in section ? section.config : {},
      })
      .returning();

    if ("productIds" in section && section.productIds) {
      for (const [i, id] of section.productIds.entries()) {
        await db.insert(homepageSectionItems).values({
          sectionId: row.id,
          productId: id,
          sortOrder: i,
        });
      }
    }

    if ("items" in section && section.items) {
      for (const [i, item] of section.items.entries()) {
        await db.insert(homepageSectionItems).values({
          sectionId: row.id,
          title: item.title,
          subtitle: "subtitle" in item ? item.subtitle : undefined,
          imageUrl: "imageUrl" in item ? item.imageUrl : undefined,
          linkUrl: "linkUrl" in item ? item.linkUrl : undefined,
          buttonLabel: "buttonLabel" in item ? item.buttonLabel : undefined,
          sortOrder: i,
        });
      }
    }
  }

  // Mega menu
  const [mainMenu] = await db
    .insert(menus)
    .values({ code: "main", name: "Ana Menü" })
    .onConflictDoNothing()
    .returning();
  const [footerMenu] = await db
    .insert(menus)
    .values({ code: "footer", name: "Footer Menü" })
    .onConflictDoNothing()
    .returning();
  const menu =
    mainMenu ??
    (await db.query.menus.findFirst({ where: eq(menus.code, "main") }));
  if (menu) {
    let order = 0;
    for (const cat of STORE_CATEGORIES.slice(0, 7)) {
    const [parentItem] = await db
      .insert(menuItems)
      .values({
          menuId: menu.id,
          label: cat.name,
          href: cat.href,
          categoryId: categoryIds[cat.slug],
          bannerUrl: `https://picsum.photos/seed/bvmenu${order}/600/300`,
          featured: order < 3,
          sortOrder: order++,
        isActive: true,
      })
      .returning();
      if (!parentItem) continue;
      for (const [j, child] of cat.children.entries()) {
      await db.insert(menuItems).values({
          menuId: menu.id,
        parentId: parentItem.id,
          label: child.name,
          href: child.href,
          categoryId: categoryIds[child.slug],
        sortOrder: j,
        isActive: true,
      });
    }
  }
  }
  const footer =
    footerMenu ??
    (await db.query.menus.findFirst({ where: eq(menus.code, "footer") }));
  if (footer) {
    for (const [i, [label, href]] of [
      ["Hakkımızda", "/sayfa/hakkimizda"],
      ["İletişim", "/sayfa/iletisim"],
      ["KVKK", "/sayfa/kvkk"],
      ["Gizlilik", "/sayfa/gizlilik"],
      ["İade", "/sayfa/iade"],
      ["Kargo", "/sayfa/kargo"],
      ["SSS", "/sayfa/sss"],
    ].entries()) {
      await db.insert(menuItems).values({
      menuId: footer.id,
        label,
        href,
        sortOrder: i,
      isActive: true,
      });
    }
  }

  // CMS pages
  for (const [title, slug] of [
    ["Hakkımızda", "hakkimizda"],
    ["İletişim", "iletisim"],
    ["KVKK", "kvkk"],
    ["Gizlilik", "gizlilik"],
    ["Kullanım Şartları", "kullanim-sartlari"],
    ["İade Şartları", "iade"],
    ["Kargo", "kargo"],
    ["SSS", "sss"],
  ] as const) {
    const content =
      slug === "iletisim"
        ? siteContactPageHtml()
        : `<h1>${title}</h1><p>BORAVIN ${title} içeriği admin panelinden düzenlenebilir.</p>`;
    const row = {
      title,
      slug,
      content,
      status: "published" as const,
      publishedAt: new Date(),
      seoTitle: `${title} | Boravin`,
      seoDescription:
        slug === "iletisim"
          ? `${siteContact.companyName}, ${siteContactAddress}`
          : undefined,
    };
    if (slug === "iletisim") {
      await db
        .insert(pages)
        .values(row)
        .onConflictDoUpdate({
          target: pages.slug,
          set: {
            title,
            content,
            status: "published",
            seoTitle: row.seoTitle,
            seoDescription: row.seoDescription,
            updatedAt: new Date(),
          },
        });
    } else {
      await db.insert(pages).values(row).onConflictDoNothing();
    }
  }

  await db.insert(blogPosts).values([
    {
      title: "2026 Gaming Laptop Rehberi",
      slug: "2026-gaming-laptop-rehberi",
      excerpt: "Doğru gaming laptop nasıl seçilir?",
      content: "Editöryel rehber içeriği…",
      featuredImage: "https://picsum.photos/seed/bvblog1/1200/630",
      category: "Rehber",
      status: "published",
      publishedAt: new Date(),
      tags: ["gaming", "laptop"],
    },
    {
      title: "iPhone mu Samsung mu?",
      slug: "iphone-mi-samsung-mu",
      excerpt: "Karşılaştırma yazısı",
      content: "Detaylı karşılaştırma…",
      featuredImage: "https://picsum.photos/seed/bvblog2/1200/630",
      category: "Telefon",
      status: "published",
      publishedAt: new Date(),
      tags: ["telefon"],
    },
    {
      title: "Ofis Yazıcısı Seçim Rehberi",
      slug: "ofis-yazicisi-secim-rehberi",
      excerpt: "Lazer mi mürekkep püskürtmeli mi?",
      content: "Baskı hacmine göre doğru yazıcı tipini seçin.",
      featuredImage: "https://picsum.photos/seed/bvblog3/1200/630",
      category: "Ofis",
      status: "published",
      publishedAt: new Date(),
      tags: ["yazici", "ofis"],
    },
    {
      title: "KKTC'de Hızlı Teslimat",
      slug: "kktc-hizli-teslimat",
      excerpt: "BORAVIN lojistik süreci",
      content: "Siparişten kapıya kadar teslimat adımları.",
      featuredImage: "https://picsum.photos/seed/bvblog4/1200/630",
      category: "Hizmet",
      status: "published",
      publishedAt: new Date(),
      tags: ["kargo", "teslimat"],
    },
  ]);

  // AI prompts
  for (const [code, name, prompt] of [
    ["campaign_prompt", "Kampanya", "Brief'e göre kampanya JSON üret."],
    ["product_description_prompt", "Ürün açıklaması", "Ürün için satış odaklı açıklama JSON üret."],
    ["seo_prompt", "SEO", "SEO title/description/keywords JSON üret."],
    ["announcement_prompt", "Duyuru", "Duyuru metinleri JSON üret."],
    ["image_prompt", "Görsel prompt", "Platformlara göre görsel prompt JSON üret."],
  ] as const) {
    await db
      .insert(aiPrompts)
      .values({ code, name, prompt, version: 1, isActive: true })
      .onConflictDoNothing();
  }

  await db
    .insert(settings)
    .values([
      {
        key: "site",
        value: {
          name: "BORAVIN",
          tagline: siteContact.tagline,
          companyName: siteContact.companyName,
          phone: siteContact.phones[0]?.display ?? "",
          email: siteContact.email,
          address: siteContactAddress,
          currency: "TRY",
        },
    },
    {
      key: "contact",
      value: siteContactSettingsValue(),
    },
    {
      key: "brand_ai_guidelines",
      value: {
          tone: "Profesyonel, güvenilir, premium",
          colors: ["#0E1116", "#F3F1ED", "#C45C26"],
          addressStyle: "Siz",
          forbiddenWords: ["ucuz", "sahte"],
          slogans: ["Kıbrısın Teknoloji Merkezi"],
          visualStyle: "Editorial tech retail",
          targetCustomer: "Kıbrıs teknoloji alıcıları",
      },
    },
    {
      key: "currency",
      value: { default: "TRY", supported: ["TRY", "USD", "EUR"] },
    },
    {
      key: "shipping",
        value: { freeAbove: 1500, defaultPrice: 75, freeShippingThreshold: 1500 },
      },
    ])
    .onConflictDoNothing();

  const siteValue = {
    name: "BORAVIN",
    tagline: siteContact.tagline,
    companyName: siteContact.companyName,
    phone: siteContact.phones[0]?.display ?? "",
    email: siteContact.email,
    address: siteContactAddress,
    currency: "TRY",
  };
  const contactValue = siteContactSettingsValue();
  await db
    .insert(settings)
    .values({ key: "site", value: siteValue })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: siteValue, updatedAt: new Date() },
    });
  await db
    .insert(settings)
    .values({ key: "contact", value: contactValue })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: contactValue, updatedAt: new Date() },
    });

  await db.insert(shippingMethods).values([
    {
      name: "Standart Teslimat",
      carrier: "Boravin Express",
      price: "75",
      freeAbove: "1500",
      etaDaysMin: 1,
      etaDaysMax: 3,
      regions: ["CY"],
      isActive: true,
    },
    {
      name: "Hızlı Teslimat",
      carrier: "Boravin SameDay",
      price: "149.90",
      freeAbove: "3000",
      etaDaysMin: 0,
      etaDaysMax: 1,
      regions: ["CY"],
      isActive: true,
    },
    {
      name: "Mağazadan Teslim",
      carrier: "Boravin Store",
      price: "0",
      freeAbove: "0",
      etaDaysMin: 0,
      etaDaysMax: 1,
      regions: ["CY"],
      isActive: true,
    },
  ]);

  console.log("Seed completed.");
  console.log("Admin: admin@boravin.com / Admin123!");
  await closeDb();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error(err);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
