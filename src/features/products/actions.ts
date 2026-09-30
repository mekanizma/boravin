"use server";

import { and, asc, desc, eq, gte, ilike, lte, or, sql, inArray } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  productImages,
  productVariants,
  products,
  brands,
  categories,
  stockMovements,
  homepageSectionItems,
} from "@/lib/db/schema";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";
import { slugify } from "@/lib/utils";

const productInputSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  brandId: z.string().uuid().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().optional().nullable(),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
  taxRate: z.coerce.number().nonnegative().optional().nullable(),
  stock: z.coerce.number().int().nonnegative(),
  minStock: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(["draft", "active", "inactive", "archived"]).default("draft"),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isCampaign: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  slug: z.string().optional(),
  technicalSpecs: z.record(z.string(), z.string()).optional(),
});

export type ProductSearchParams = {
  q?: string;
  category?: string;
  brand?: string;
  min?: number;
  max?: number;
  status?: string;
  page?: number;
  pageSize?: number;
  sort?: "recommended" | "newest" | "price_asc" | "price_desc" | "popular";
  attrs?: Record<string, string>;
};

export async function searchProducts(params: ProductSearchParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 24));
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (params.q) {
    const q = `%${params.q}%`;
    conditions.push(
      or(
        ilike(products.name, q),
        ilike(products.sku, q),
        ilike(products.barcode, q),
        ilike(products.description, q),
        sql`similarity(${products.name}, ${params.q}) > 0.2`,
      ),
    );
  }

  if (params.category) {
    conditions.push(eq(products.categoryId, params.category));
  }
  if (params.brand) {
    conditions.push(eq(products.brandId, params.brand));
  }
  if (params.min != null) {
    conditions.push(gte(products.price, String(params.min)));
  }
  if (params.max != null) {
    conditions.push(lte(products.price, String(params.max)));
  }
  if (params.status) {
    conditions.push(
      eq(
        products.status,
        params.status as "draft" | "active" | "inactive" | "archived",
      ),
    );
  } else {
    conditions.push(eq(products.status, "active"));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  let orderBy = [
    desc(products.isFeatured),
    desc(products.isCampaign),
    desc(products.soldCount),
    desc(products.createdAt),
  ];
  if (params.sort === "price_asc") orderBy = [asc(products.price), desc(products.createdAt)];
  if (params.sort === "price_desc") orderBy = [desc(products.price), desc(products.createdAt)];
  if (params.sort === "newest") orderBy = [desc(products.createdAt)];
  if (params.sort === "popular") orderBy = [desc(products.soldCount), desc(products.createdAt)];

  const [rows, countRow] = await Promise.all([
    db.query.products.findMany({
      where,
      orderBy,
      limit: pageSize,
      offset,
      with: {
        images: true,
        brand: true,
        category: true,
        variants: true,
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(where),
  ]);

  return {
    items: rows,
    total: countRow[0]?.count ?? 0,
    page,
    pageSize,
  };
}

export async function getProductBySlug(slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      images: true,
      brand: true,
      category: true,
      variants: true,
    },
  });
}

export type CompareProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  brandName: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  shortDescription: string | null;
};

export async function getProductsForCompare(
  ids: string[],
): Promise<CompareProduct[]> {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 4);
  if (!unique.length) return [];

  try {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        stock: products.stock,
        shortDescription: products.shortDescription,
        brandName: brands.name,
        categoryName: categories.name,
        imageUrl: productImages.url,
        isPrimary: productImages.isPrimary,
        sortOrder: productImages.sortOrder,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productImages, eq(productImages.productId, products.id))
      .where(inArray(products.id, unique));

    const byId = new Map<string, CompareProduct>();
    for (const row of rows) {
      const existing = byId.get(row.id);
      const imageCandidate = row.imageUrl;
      if (!existing) {
        byId.set(row.id, {
          id: row.id,
          name: row.name,
          slug: row.slug,
          sku: row.sku,
          price: Number(row.price),
          compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : null,
          stock: row.stock,
          brandName: row.brandName ?? null,
          categoryName: row.categoryName ?? null,
          imageUrl: imageCandidate,
          shortDescription: row.shortDescription ?? null,
        });
        continue;
      }
      if (!existing.imageUrl && imageCandidate) {
        existing.imageUrl = imageCandidate;
      } else if (imageCandidate && row.isPrimary) {
        existing.imageUrl = imageCandidate;
      }
    }

    return unique
      .map((id) => byId.get(id))
      .filter((row): row is CompareProduct => Boolean(row));
  } catch {
    return [];
  }
}

export async function createProduct(input: z.infer<typeof productInputSchema>) {
  const session = await requirePermission("PRODUCT_CREATE");
  const data = productInputSchema.parse(input);
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);

  const [created] = await db
    .insert(products)
    .values({
      name: data.name,
      slug,
      sku: data.sku,
      barcode: data.barcode ?? null,
      categoryId: data.categoryId ?? null,
      brandId: data.brandId ?? null,
      shortDescription: data.shortDescription ?? null,
      description: data.description ?? null,
      price: String(data.price),
      compareAtPrice:
        data.compareAtPrice != null ? String(data.compareAtPrice) : null,
      costPrice: data.costPrice != null ? String(data.costPrice) : null,
      taxRate: data.taxRate != null ? String(data.taxRate) : "0",
      stock: data.stock,
      minStock: data.minStock ?? 5,
      status: data.status,
      isFeatured: data.isFeatured ?? false,
      isNew: data.isNew ?? false,
      isCampaign: data.isCampaign ?? false,
      tags: data.tags ?? [],
      technicalSpecs: data.technicalSpecs ?? {},
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
    })
    .returning();

  if (created.stock > 0) {
    await db.insert(stockMovements).values({
      productId: created.id,
      type: "in",
      quantity: created.stock,
      stockBefore: 0,
      stockAfter: created.stock,
      note: "Ürün oluşturuldu",
      userId: session.user.id,
    });
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "PRODUCT_CREATE",
    entityType: "product",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/stock");
  revalidatePath("/urunler");
  revalidateTag("products", "max");
  revalidateTag("product-cards", "max");
  revalidateTag("homepage", "max");
  revalidatePath("/");
  return created;
}

export async function updateProduct(
  id: string,
  input: Partial<z.infer<typeof productInputSchema>>,
) {
  const session = await requirePermission("PRODUCT_EDIT");
  const before = await db.query.products.findFirst({
    where: eq(products.id, id),
  });
  if (!before) throw new Error("NOT_FOUND");

  const data = productInputSchema.partial().parse(input);
  const [updated] = await db
    .update(products)
    .set({
      ...("name" in data && data.name ? { name: data.name } : {}),
      ...("slug" in data && data.slug ? { slug: slugify(data.slug) } : {}),
      ...("sku" in data && data.sku ? { sku: data.sku } : {}),
      ...("barcode" in data ? { barcode: data.barcode ?? null } : {}),
      ...("categoryId" in data ? { categoryId: data.categoryId ?? null } : {}),
      ...("brandId" in data ? { brandId: data.brandId ?? null } : {}),
      ...("shortDescription" in data
        ? { shortDescription: data.shortDescription ?? null }
        : {}),
      ...("description" in data
        ? { description: data.description ?? null }
        : {}),
      ...("price" in data && data.price != null
        ? { price: String(data.price) }
        : {}),
      ...("compareAtPrice" in data
        ? {
            compareAtPrice:
              data.compareAtPrice != null ? String(data.compareAtPrice) : null,
          }
        : {}),
      ...("stock" in data && data.stock != null ? { stock: data.stock } : {}),
      ...("status" in data && data.status ? { status: data.status } : {}),
      ...("isFeatured" in data ? { isFeatured: data.isFeatured ?? false } : {}),
      ...("isNew" in data ? { isNew: data.isNew ?? false } : {}),
      ...("isCampaign" in data ? { isCampaign: data.isCampaign ?? false } : {}),
      ...("seoTitle" in data ? { seoTitle: data.seoTitle ?? null } : {}),
      ...("seoDescription" in data
        ? { seoDescription: data.seoDescription ?? null }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  if (data.stock != null && data.stock !== before.stock) {
    await db.insert(stockMovements).values({
      productId: id,
      type: "adjust",
      quantity: data.stock - before.stock,
      stockBefore: before.stock,
      stockAfter: data.stock,
      note: "Ürün formundan güncellendi",
      userId: session.user.id,
    });
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "PRODUCT_EDIT",
    entityType: "product",
    entityId: id,
    before,
    after: updated,
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/stock");
  revalidatePath(`/urun/${updated.slug}`);
  revalidateTag("products", "max");
  revalidateTag("product-cards", "max");
  revalidateTag("homepage", "max");
  revalidatePath("/");
  return updated;
}

export async function deleteProduct(id: string) {
  const session = await requirePermission("PRODUCT_DELETE");
  const before = await db.query.products.findFirst({
    where: eq(products.id, id),
  });
  if (!before) {
    return { ok: false as const, error: "NOT_FOUND" as const };
  }

  try {
    await db
      .update(homepageSectionItems)
      .set({ productId: null })
      .where(eq(homepageSectionItems.productId, id));

    await db.delete(products).where(eq(products.id, id));
  } catch (error) {
    console.error("[deleteProduct]", error);
    return { ok: false as const, error: "DELETE_FAILED" as const };
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "PRODUCT_DELETE",
    entityType: "product",
    entityId: id,
    before,
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/stock");
  revalidatePath("/urunler");
  revalidatePath(`/urun/${before.slug}`);
  revalidateTag("products", "max");
  revalidateTag("product-cards", "max");
  revalidateTag("homepage", "max");
  revalidatePath("/");
  return { ok: true as const };
}


export async function bulkUpdateProducts(input: {
  ids: string[];
  action:
    | "publish"
    | "unpublish"
    | "price_plus_10"
    | "price_minus_10"
    | "set_category"
    | "add_tag";
  categoryId?: string;
  tag?: string;
}) {
  const session = await requirePermission("PRODUCT_EDIT");
  if (!input.ids.length) return { updated: 0 };

  if (input.action === "publish") {
    await db
      .update(products)
      .set({ status: "active", updatedAt: new Date() })
      .where(inArray(products.id, input.ids));
  } else if (input.action === "unpublish") {
    await db
      .update(products)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(inArray(products.id, input.ids));
  } else if (input.action === "price_plus_10") {
    await db
      .update(products)
      .set({
        price: sql`round((${products.price}::numeric * 1.10)::numeric, 2)`,
        updatedAt: new Date(),
      })
      .where(inArray(products.id, input.ids));
  } else if (input.action === "price_minus_10") {
    await db
      .update(products)
      .set({
        price: sql`round((${products.price}::numeric * 0.90)::numeric, 2)`,
        updatedAt: new Date(),
      })
      .where(inArray(products.id, input.ids));
  } else if (input.action === "set_category" && input.categoryId) {
    await db
      .update(products)
      .set({ categoryId: input.categoryId, updatedAt: new Date() })
      .where(inArray(products.id, input.ids));
  } else if (input.action === "add_tag" && input.tag) {
    await db
      .update(products)
      .set({
        tags: sql`(
          SELECT COALESCE(jsonb_agg(DISTINCT value), '[]'::jsonb)
          FROM jsonb_array_elements_text(COALESCE(${products.tags}, '[]'::jsonb) || ${JSON.stringify([input.tag])}::jsonb) AS value
        )`,
        updatedAt: new Date(),
      })
      .where(inArray(products.id, input.ids));
  }

  await writeAuditLog({
    userId: session.user.id,
    action: `PRODUCT_BULK_${input.action.toUpperCase()}`,
    entityType: "product",
    after: { ids: input.ids, action: input.action },
  });

  revalidatePath("/admin/products");
  revalidatePath("/urunler");
  revalidateTag("products", "max");
  revalidateTag("product-cards", "max");
  revalidateTag("homepage", "max");
  revalidatePath("/");
  return { updated: input.ids.length };
}

export async function listCategoriesTree() {
  const rows = await db.query.categories.findMany({
    orderBy: [asc(categories.sortOrder), asc(categories.name)],
  });
  return rows;
}

export async function listBrands() {
  return db.query.brands.findMany({
    where: eq(brands.isActive, true),
    orderBy: [asc(brands.name)],
  });
}

export async function upsertVariant(
  productId: string,
  input: {
    id?: string;
    name: string;
    sku: string;
    stock: number;
    price?: number;
    compareAtPrice?: number;
    barcode?: string;
    imageUrl?: string;
    options?: Record<string, string>;
  },
) {
  await requirePermission("PRODUCT_EDIT");
  if (input.id) {
    const [row] = await db
      .update(productVariants)
      .set({
        name: input.name,
        sku: input.sku,
        stock: input.stock,
        price: input.price != null ? String(input.price) : null,
        compareAtPrice:
          input.compareAtPrice != null ? String(input.compareAtPrice) : null,
        barcode: input.barcode,
        imageUrl: input.imageUrl,
        options: input.options ?? {},
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, input.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(productVariants)
    .values({
      productId,
      name: input.name,
      sku: input.sku,
      stock: input.stock,
      price: input.price != null ? String(input.price) : null,
      compareAtPrice:
        input.compareAtPrice != null ? String(input.compareAtPrice) : null,
      barcode: input.barcode,
      imageUrl: input.imageUrl,
      options: input.options ?? {},
    })
    .returning();
  return row;
}

export async function addProductImage(
  productId: string,
  input: { url: string; alt?: string; isPrimary?: boolean },
) {
  await requirePermission("PRODUCT_EDIT");
  if (input.isPrimary) {
    await db
      .update(productImages)
      .set({ isPrimary: false })
      .where(eq(productImages.productId, productId));
  }
  const [row] = await db
    .insert(productImages)
    .values({
      productId,
      url: input.url,
      alt: input.alt,
      isPrimary: input.isPrimary ?? false,
    })
    .returning();
  return row;
}
