"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lookupBarcodeExternal } from "@/lib/barcode/lookup";
import {
  storeRemoteProductImage,
  storeUploadedProductImage,
} from "@/lib/barcode/import-images";
import {
  matchBrandId,
  matchCategoryId,
  normalizeBarcode,
  sanitizeSpecs,
  barcodeCandidates,
  isAllowedProductImageUrl,
} from "@/lib/barcode/parse";
import type {
  BarcodeLookupResult,
  CatalogOption,
  CreateFromBarcodeResult,
} from "@/lib/barcode/types";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";
import { getDb, isTransientDbError, recoverDb } from "@/lib/db";
import {
  brands,
  categories,
  productImages,
  productVariants,
  products,
  stockMovements,
} from "@/lib/db/schema";
import { rateLimit } from "@/lib/security/rate-limit";
import { slugify } from "@/lib/utils";

const saveSchema = z.object({
  name: z.string().trim().min(2, "Ürün adı gerekli."),
  sku: z.string().trim().min(2, "SKU gerekli."),
  barcode: z.string().trim().min(8).max(14),
  categoryId: z.string().uuid().nullable(),
  brandId: z.string().uuid().nullable(),
  brandName: z.string().trim().max(160),
  shortDescription: z.string().trim().max(500),
  description: z.string().trim().max(12000),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().nullable(),
  stock: z.number().int().nonnegative(),
  status: z.enum(["draft", "active"]),
});

function formText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function catalogOptions(): Promise<{
  categories: CatalogOption[];
  brands: CatalogOption[];
}> {
  const database = getDb();
  const [categoryRows, brandRows] = await Promise.all([
    database
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories),
    database.select({ id: brands.id, name: brands.name, slug: brands.slug }).from(brands),
  ]);
  return { categories: categoryRows, brands: brandRows };
}

async function findExisting(codes: string[]) {
  const database = getDb();
  for (const code of codes) {
    const [product] = await database
      .select({ id: products.id, name: products.name, sku: products.sku })
      .from(products)
      .where(eq(products.barcode, code))
      .limit(1);
    if (product) return product;
  }

  for (const code of codes) {
    const [variant] = await database
      .select({ productId: productVariants.productId })
      .from(productVariants)
      .where(eq(productVariants.barcode, code))
      .limit(1);
    if (!variant) continue;
    const [parent] = await database
      .select({ id: products.id, name: products.name, sku: products.sku })
      .from(products)
      .where(eq(products.id, variant.productId))
      .limit(1);
    if (parent) return parent;
  }
  return null;
}

export async function lookupBarcodeAction(rawBarcode: string): Promise<BarcodeLookupResult> {
  try {
    return await lookupBarcode(rawBarcode);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[barcode-lookup]", error);
    if (message === "UNAUTHORIZED") {
      return { ok: false, message: "Oturum gerekli. Tekrar giriş yapın." };
    }
    if (message === "FORBIDDEN") {
      return { ok: false, message: "Ürün ekleme yetkiniz yok." };
    }
    return {
      ok: false,
      message: "Barkod sorgusu tamamlanamadı. Tekrar deneyin veya bilgileri elle girin.",
    };
  }
}

async function lookupBarcode(rawBarcode: string): Promise<BarcodeLookupResult> {
  const session = await requirePermission("PRODUCT_CREATE");
  const barcode = normalizeBarcode(rawBarcode);
  if (!barcode) {
    return { ok: false, message: "Barkod 8, 12, 13 veya 14 haneli olmalı." };
  }

  const limit = rateLimit(`barcode-lookup:${session.user.id}`, {
    windowMs: 60_000,
    max: 30,
  });
  if (!limit.success) {
    return { ok: false, message: "Çok sık sorgulandı. Bir dakika sonra tekrar deneyin." };
  }

  const codes = barcodeCandidates(barcode);
  let existing: Awaited<ReturnType<typeof findExisting>> = null;
  try {
    existing = await findExisting(codes);
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    try {
      await recoverDb();
      existing = await findExisting(codes);
    } catch (retryError) {
      if (!isTransientDbError(retryError)) throw retryError;
      existing = null;
    }
  }
  if (existing) {
    return {
      ok: true,
      barcode,
      existing,
      draft: null,
      offline: false,
      matchedCategoryId: null,
      matchedBrandId: null,
    };
  }

  const external = await lookupBarcodeExternal(barcode);
  if (!external.draft) {
    return {
      ok: true,
      barcode,
      existing: null,
      draft: null,
      offline: external.offline,
      matchedCategoryId: null,
      matchedBrandId: null,
    };
  }

  let catalog = { categories: [] as CatalogOption[], brands: [] as CatalogOption[] };
  try {
    catalog = await catalogOptions();
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    try {
      await recoverDb();
      catalog = await catalogOptions();
    } catch (retryError) {
      if (!isTransientDbError(retryError)) throw retryError;
    }
  }
  return {
    ok: true,
    barcode,
    existing: null,
    draft: external.draft,
    offline: false,
    matchedCategoryId: matchCategoryId(
      catalog.categories,
      external.draft.categoryHint,
      external.draft.name,
    ),
    matchedBrandId: matchBrandId(catalog.brands, external.draft.brand),
  };
}

async function resolveBrand(brandId: string | null, brandName: string) {
  if (brandId) {
    const row = await getDb().query.brands.findFirst({
      where: eq(brands.id, brandId),
      columns: { id: true },
    });
    if (row) return { id: row.id, created: false };
  }
  const name = brandName.trim();
  const slug = slugify(name);
  if (!name || !slug) return { id: null, created: false };
  const existing = await getDb().query.brands.findFirst({
    where: eq(brands.slug, slug),
    columns: { id: true },
  });
  if (existing) return { id: existing.id, created: false };
  const [created] = await getDb()
    .insert(brands)
    .values({ name: name.slice(0, 160), slug, isActive: true })
    .onConflictDoNothing()
    .returning();
  if (created) return { id: created.id, created: true };
  const again = await getDb().query.brands.findFirst({
    where: eq(brands.slug, slug),
    columns: { id: true },
  });
  return { id: again?.id ?? null, created: false };
}

async function uniqueSku(base: string, barcode: string) {
  let sku = base.slice(0, 64);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const taken = await getDb().query.products.findFirst({
      where: eq(products.sku, sku),
      columns: { id: true },
    });
    if (!taken) return sku;
    const suffix = attempt === 0 ? barcode.slice(-4) : barcode.slice(-4) + String(attempt);
    sku = `${base.slice(0, 64 - suffix.length - 1)}-${suffix}`;
  }
  return `${base.slice(0, 50)}-${barcode.slice(-6)}`;
}

async function uniqueSlug(name: string, barcode: string) {
  let slug = slugify(name) || `urun-${barcode}`;
  const taken = await getDb().query.products.findFirst({
    where: eq(products.slug, slug),
    columns: { id: true },
  });
  if (!taken) return slug;
  slug = `${slug}-${barcode.slice(-6)}`.slice(0, 280);
  return slug;
}

export async function createProductFromBarcodeAction(
  formData: FormData,
): Promise<CreateFromBarcodeResult> {
  const session = await requirePermission("PRODUCT_CREATE");

  const barcode = normalizeBarcode(formText(formData, "barcode"));
  if (!barcode) {
    return { ok: false, message: "Geçerli bir barkod girin." };
  }

  const priceText = formText(formData, "price");
  const stockText = formText(formData, "stock");
  if (!priceText) return { ok: false, message: "Satış fiyatını girin." };
  if (!stockText) return { ok: false, message: "Stok adedini girin." };

  const parsed = saveSchema.safeParse({
    name: formText(formData, "name"),
    sku: formText(formData, "sku"),
    barcode,
    categoryId: formText(formData, "categoryId") || null,
    brandId: formText(formData, "brandId") || null,
    brandName: formText(formData, "brandName"),
    shortDescription: formText(formData, "shortDescription"),
    description: formText(formData, "description"),
    price: Number(priceText.replace(",", ".")),
    compareAtPrice: formText(formData, "compareAtPrice")
      ? Number(formText(formData, "compareAtPrice").replace(",", "."))
      : null,
    stock: Number(stockText),
    status: formText(formData, "status") === "active" ? "active" : "draft",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Eksik veya hatalı alan var.",
    };
  }
  const data = parsed.data;
  if (!Number.isFinite(data.price) || !Number.isFinite(data.stock)) {
    return { ok: false, message: "Fiyat ve stok sayı olmalı." };
  }

  const existing = await findExisting(barcodeCandidates(barcode));
  if (existing) {
    return {
      ok: false,
      message: "Bu barkod zaten kayıtlı.",
      existingId: existing.id,
    };
  }

  let specs: Record<string, string> = {};
  try {
    const raw = JSON.parse(formText(formData, "specs") || "{}") as unknown;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      specs = sanitizeSpecs(
        Object.fromEntries(
          Object.entries(raw).map(([key, value]) => [key, String(value ?? "")]),
        ),
      );
    }
  } catch {
    specs = {};
  }

  const remoteUrls = (() => {
    try {
      const raw = JSON.parse(formText(formData, "remoteImages") || "[]") as unknown;
      if (!Array.isArray(raw)) return [];
      return raw
        .map((url) => String(url))
        .filter(isAllowedProductImageUrl)
        .slice(0, 6);
    } catch {
      return [];
    }
  })();

  const uploads = formData
    .getAll("files")
    .filter((file): file is File => file instanceof File && file.size > 0)
    .slice(0, 8);

  const storedUploads = (
    await Promise.all(uploads.map((file) => storeUploadedProductImage(file)))
  ).filter((url): url is string => Boolean(url));
  const storedRemote = (
    await Promise.all(remoteUrls.map((url) => storeRemoteProductImage(url)))
  ).filter((url): url is string => Boolean(url));
  const imageUrls = [...storedRemote, ...storedUploads].slice(0, 8);
  const remoteFailed = remoteUrls.length - storedRemote.length;

  if (data.status === "active" && imageUrls.length === 0) {
    return {
      ok: false,
      message:
        "Yayınlamak için en az bir ürün görseli gerekli. Görsel yoksa yükleyin veya taslak kaydedin.",
    };
  }

  const brand = await resolveBrand(data.brandId, data.brandName);
  const sku = await uniqueSku(data.sku, barcode);
  const slug = await uniqueSlug(data.name, barcode);

  const [created] = await getDb()
    .insert(products)
    .values({
      name: data.name,
      slug,
      sku,
      barcode,
      categoryId: data.categoryId,
      brandId: brand.id,
      shortDescription: data.shortDescription || null,
      description: data.description || null,
      price: data.price.toFixed(2),
      compareAtPrice:
        data.compareAtPrice != null ? data.compareAtPrice.toFixed(2) : null,
      stock: data.stock,
      status: data.status,
      technicalSpecs: specs,
      seoTitle: data.name.slice(0, 180),
      seoDescription: (data.shortDescription || data.description).slice(0, 300) || null,
    })
    .returning();

  if (!created) {
    return { ok: false, message: "Ürün kaydedilemedi." };
  }

  if (created.stock > 0) {
    await getDb().insert(stockMovements).values({
      productId: created.id,
      type: "in",
      quantity: created.stock,
      stockBefore: 0,
      stockAfter: created.stock,
      note: "Barkod ile ürün oluşturuldu",
      userId: session.user.id,
    });
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "PRODUCT_CREATE",
    entityType: "product",
    entityId: created.id,
    after: { ...created, source: "barcode" },
  });

  if (imageUrls.length) {
    await getDb().insert(productImages).values(
      imageUrls.map((url, index) => ({
        productId: created.id,
        url,
        alt: data.name.slice(0, 255),
        sortOrder: index,
        isPrimary: index === 0,
      })),
    );
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${created.id}`);
  revalidatePath("/urunler");
  if (brand.created) revalidatePath("/admin/brands");

  const warning =
    remoteFailed > 0
      ? `${remoteFailed} görsel indirilemedi. Kalan görseller eklendi.`
      : imageUrls.length === 0
        ? "Görsel eklenmedi. İsterseniz ürün sayfasından sonra yükleyebilirsiniz."
        : undefined;

  return { ok: true, id: created.id, imageCount: imageUrls.length, warning };
}
