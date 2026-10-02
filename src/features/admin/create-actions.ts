"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  announcements,
  blogPosts,
  brands,
  campaigns,
  categories,
  coupons,
  media,
  menus,
  pages,
  roles,
} from "@/lib/db/schema";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";
import { slugify } from "@/lib/utils";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function uniqueSlug(
  exists: (slug: string) => Promise<boolean>,
  base: string,
  fallback: string,
) {
  let slug = slugify(base) || fallback;
  if (!(await exists(slug))) return slug;
  for (let i = 2; i < 50; i += 1) {
    const candidate = `${slug}-${i}`.slice(0, 200);
    if (!(await exists(candidate))) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`.slice(0, 200);
}

const categorySchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export async function createCategory(
  raw: z.infer<typeof categorySchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("CATEGORY_MANAGE");
    const data = categorySchema.parse(raw);
    const slug = await uniqueSlug(
      async (s) =>
        Boolean(
          await db.query.categories.findFirst({
            where: eq(categories.slug, s),
            columns: { id: true },
          }),
        ),
      data.slug?.trim() || data.name,
      "kategori",
    );

    const [row] = await db
      .insert(categories)
      .values({
        name: data.name,
        slug,
        description: data.description?.trim() || null,
        parentId: data.parentId || null,
        sortOrder: data.sortOrder ?? 0,
        isActive: true,
      })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "CATEGORY_CREATE",
      entityType: "category",
      entityId: row.id,
      after: { name: data.name, slug },
    });
    revalidatePath("/admin/categories");
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçersiz kategori bilgisi.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Kategori eklenemedi.");
  }
}

const brandSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
});

export async function createBrand(
  raw: z.infer<typeof brandSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("BRAND_MANAGE");
    const data = brandSchema.parse(raw);
    const slug = await uniqueSlug(
      async (s) =>
        Boolean(
          await db.query.brands.findFirst({
            where: eq(brands.slug, s),
            columns: { id: true },
          }),
        ),
      data.slug?.trim() || data.name,
      "marka",
    );

    const [row] = await db
      .insert(brands)
      .values({
        name: data.name,
        slug,
        description: data.description?.trim() || null,
        isActive: true,
      })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "BRAND_CREATE",
      entityType: "brand",
      entityId: row.id,
      after: { name: data.name, slug },
    });
    revalidatePath("/admin/brands");
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçersiz marka bilgisi.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Marka eklenemedi.");
  }
}

const campaignSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(200).optional().nullable(),
  type: z.enum([
    "percent",
    "fixed",
    "product",
    "category",
    "brand",
    "buy_x_get_y",
    "free_shipping",
    "coupon",
  ]),
  value: z.coerce.number().nonnegative().optional().nullable(),
  shortDescription: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).default("published"),
});

export async function createCampaign(
  raw: z.infer<typeof campaignSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("CAMPAIGN_CREATE");
    const data = campaignSchema.parse(raw);
    const slug = await uniqueSlug(
      async (s) =>
        Boolean(
          await db.query.campaigns.findFirst({
            where: eq(campaigns.slug, s),
            columns: { id: true },
          }),
        ),
      data.slug?.trim() || data.name,
      "kampanya",
    );

    const [row] = await db
      .insert(campaigns)
      .values({
        name: data.name,
        slug,
        type: data.type,
        value: data.value != null ? String(data.value) : null,
        shortDescription: data.shortDescription?.trim() || null,
        status: data.status,
        cta: "Hemen keşfet",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 86400000),
      })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "CAMPAIGN_CREATE",
      entityType: "campaign",
      entityId: row.id,
      after: { name: data.name, slug, type: data.type },
    });
    revalidatePath("/admin/campaigns");
    revalidateTag("campaigns", "max");
    revalidatePath("/");
    revalidatePath("/kampanyalar");
    revalidatePath(`/kampanya/${slug}`);
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçersiz kampanya bilgisi.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Kampanya eklenemedi.");
  }
}

const couponSchema = z.object({
  code: z.string().trim().min(2).max(64),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().positive(),
  minCartAmount: z.coerce.number().nonnegative().optional().nullable(),
  usageLimit: z.coerce.number().int().positive().optional().nullable(),
});

export async function createCoupon(
  raw: z.infer<typeof couponSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("COUPON_MANAGE");
    const data = couponSchema.parse(raw);
    const code = data.code.toUpperCase().replace(/\s+/g, "");

    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.code, code),
      columns: { id: true },
    });
    if (existing) return fail("Bu kupon kodu zaten kayıtlı.");

    const [row] = await db
      .insert(coupons)
      .values({
        code,
        type: data.type,
        value: String(data.value),
        minCartAmount:
          data.minCartAmount != null ? String(data.minCartAmount) : null,
        usageLimit: data.usageLimit ?? null,
        perUserLimit: 1,
        isActive: true,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 60 * 86400000),
      })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "COUPON_CREATE",
      entityType: "coupon",
      entityId: row.id,
      after: { code, type: data.type, value: data.value },
    });
    revalidatePath("/admin/coupons");
    revalidatePath("/sepet");
    revalidatePath("/odeme");
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçersiz kupon bilgisi.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Kupon eklenemedi.");
  }
}

const announcementSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  type: z.enum(["top_bar", "popup", "homepage_banner", "campaign_banner"]),
  linkUrl: z.string().trim().max(500).optional().nullable(),
  cta: z.string().trim().max(120).optional().nullable(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).default("published"),
  priority: z.number().int().min(0).max(999).optional(),
});

function revalidateAnnouncements() {
  revalidatePath("/admin/announcements");
  revalidateTag("announcements", "max");
  revalidatePath("/", "layout");
  revalidatePath("/");
}

export async function createAnnouncement(
  raw: z.infer<typeof announcementSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const data = announcementSchema.parse(raw);

    let priority = data.priority ?? 0;
    if (data.priority == null || data.priority === 0) {
      try {
        const [row] = await db
          .select({
            max: sql<number>`coalesce(max(${announcements.priority}), 0)::int`,
          })
          .from(announcements);
        priority = (row?.max ?? 0) + 1;
      } catch {
        priority = 1;
      }
    }

    const [row] = await db
      .insert(announcements)
      .values({
        title: data.title,
        description: data.description?.trim() || null,
        type: data.type,
        linkUrl: data.linkUrl?.trim() || null,
        cta: data.cta?.trim() || null,
        status: data.status,
        priority,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 86400000),
      })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "ANNOUNCEMENT_CREATE",
      entityType: "announcement",
      entityId: row.id,
      after: { title: data.title, type: data.type },
    });
    revalidateAnnouncements();
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçersiz duyuru bilgisi.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Duyuru eklenemedi.");
  }
}

export async function updateAnnouncement(
  id: string,
  raw: z.infer<typeof announcementSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const data = announcementSchema.parse(raw);

    const before = await db.query.announcements.findFirst({
      where: eq(announcements.id, id),
    });
    if (!before) return fail("Duyuru bulunamadı.");

    const [row] = await db
      .update(announcements)
      .set({
        title: data.title,
        description: data.description?.trim() || null,
        type: data.type,
        linkUrl: data.linkUrl?.trim() || null,
        cta: data.cta?.trim() || null,
        status: data.status,
        priority: data.priority ?? before.priority,
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, id))
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "ANNOUNCEMENT_UPDATE",
      entityType: "announcement",
      entityId: row.id,
      before: { title: before.title, status: before.status, type: before.type },
      after: { title: data.title, status: data.status, type: data.type },
    });
    revalidateAnnouncements();
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçersiz duyuru bilgisi.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Duyuru güncellenemedi.");
  }
}

export async function setAnnouncementStatus(
  id: string,
  status: "published" | "draft" | "archived",
): Promise<ActionResult> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const before = await db.query.announcements.findFirst({
      where: eq(announcements.id, id),
    });
    if (!before) return fail("Duyuru bulunamadı.");

    const [row] = await db
      .update(announcements)
      .set({
        status,
        updatedAt: new Date(),
        ...(status === "published"
          ? {
              startsAt: new Date(),
              endsAt: new Date(Date.now() + 30 * 86400000),
            }
          : {}),
      })
      .where(eq(announcements.id, id))
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action:
        status === "published"
          ? "ANNOUNCEMENT_PUBLISH"
          : status === "draft"
            ? "ANNOUNCEMENT_UNPUBLISH"
            : "ANNOUNCEMENT_ARCHIVE",
      entityType: "announcement",
      entityId: row.id,
      before: { status: before.status },
      after: { status },
    });
    revalidateAnnouncements();
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Duyuru durumu güncellenemedi.");
  }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const before = await db.query.announcements.findFirst({
      where: eq(announcements.id, id),
    });
    if (!before) return fail("Duyuru bulunamadı.");

    await db.delete(announcements).where(eq(announcements.id, id));

    await writeAuditLog({
      userId: session.user.id,
      action: "ANNOUNCEMENT_DELETE",
      entityType: "announcement",
      entityId: id,
      before: { title: before.title, type: before.type, status: before.status },
    });
    revalidateAnnouncements();
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Duyuru silinemedi.");
  }
}

const pageSchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().max(200).optional().nullable(),
  content: z.string().trim().max(20000).optional().nullable(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
});

export async function createPage(
  raw: z.infer<typeof pageSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const data = pageSchema.parse(raw);
    const slug = await uniqueSlug(
      async (s) =>
        Boolean(
          await db.query.pages.findFirst({
            where: eq(pages.slug, s),
            columns: { id: true },
          }),
        ),
      data.slug?.trim() || data.title,
      "sayfa",
    );

    const [row] = await db
      .insert(pages)
      .values({
        title: data.title,
        slug,
        content: data.content?.trim() || null,
        status: data.status,
        publishedAt: data.status === "published" ? new Date() : null,
      })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "PAGE_CREATE",
      entityType: "page",
      entityId: row.id,
      after: { title: data.title, slug },
    });
    revalidatePath("/admin/pages");
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçersiz sayfa bilgisi.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Sayfa eklenemedi.");
  }
}

const blogSchema = z.object({
  title: z.string().trim().min(2).max(220),
  slug: z.string().trim().max(240).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  excerpt: z.string().trim().max(1000).optional().nullable(),
  content: z.string().trim().max(50000).optional().nullable(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
});

export async function createBlogPost(
  raw: z.infer<typeof blogSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const data = blogSchema.parse(raw);
    const slug = await uniqueSlug(
      async (s) =>
        Boolean(
          await db.query.blogPosts.findFirst({
            where: eq(blogPosts.slug, s),
            columns: { id: true },
          }),
        ),
      data.slug?.trim() || data.title,
      "yazi",
    );

    const [row] = await db
      .insert(blogPosts)
      .values({
        title: data.title,
        slug,
        category: data.category?.trim() || null,
        excerpt: data.excerpt?.trim() || null,
        content: data.content?.trim() || null,
        status: data.status,
        publishedAt: data.status === "published" ? new Date() : null,
      })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "BLOG_CREATE",
      entityType: "blog_post",
      entityId: row.id,
      after: { title: data.title, slug },
    });
    revalidatePath("/admin/blog");
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçersiz yazı bilgisi.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Yazı eklenemedi.");
  }
}

const menuSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(64),
});

export async function createMenu(
  raw: z.infer<typeof menuSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const data = menuSchema.parse(raw);
    const code = slugify(data.code).replace(/-/g, "_") || slugify(data.name);

    const existing = await db.query.menus.findFirst({
      where: eq(menus.code, code),
      columns: { id: true },
    });
    if (existing) return fail("Bu menü kodu zaten kayıtlı.");

    const [row] = await db
      .insert(menus)
      .values({ name: data.name, code })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "MENU_CREATE",
      entityType: "menu",
      entityId: row.id,
      after: { name: data.name, code },
    });
    revalidatePath("/admin/menus");
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçersiz menü bilgisi.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Menü eklenemedi.");
  }
}

const roleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(64),
  description: z.string().trim().max(500).optional().nullable(),
});

export async function createRole(
  raw: z.infer<typeof roleSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("USER_MANAGE");
    const data = roleSchema.parse(raw);
    const code = data.code
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!code) return fail("Geçerli bir rol kodu girin.");

    const existing = await db.query.roles.findFirst({
      where: eq(roles.code, code),
      columns: { id: true },
    });
    if (existing) return fail("Bu rol kodu zaten kayıtlı.");

    const [row] = await db
      .insert(roles)
      .values({
        name: data.name,
        code,
        description: data.description?.trim() || null,
      })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "ROLE_CREATE",
      entityType: "role",
      entityId: row.id,
      after: { name: data.name, code },
    });
    revalidatePath("/admin/roles");
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçersiz rol bilgisi.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Rol eklenemedi.");
  }
}

const mediaSchema = z.object({
  url: z.string().trim().url().max(2000),
  originalName: z.string().trim().min(1).max(255).optional().nullable(),
  folder: z.string().trim().max(120).optional().nullable(),
  alt: z.string().trim().max(255).optional().nullable(),
});

export async function createMediaFromUrl(
  raw: z.infer<typeof mediaSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("MEDIA_MANAGE");
    const data = mediaSchema.parse(raw);
    const url = data.url.trim();
    let originalName = data.originalName?.trim() || "";
    if (!originalName) {
      try {
        const pathPart = new URL(url).pathname.split("/").filter(Boolean).pop();
        originalName = decodeURIComponent(pathPart || "media");
      } catch {
        originalName = "media";
      }
    }
    const filename = originalName.slice(0, 255);
    const ext = filename.includes(".")
      ? filename.split(".").pop()?.toLowerCase()
      : "";
    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "webp"
            ? "image/webp"
            : ext === "gif"
              ? "image/gif"
              : ext === "svg"
                ? "image/svg+xml"
                : "application/octet-stream";

    const [row] = await db
      .insert(media)
      .values({
        filename,
        originalName: filename,
        url,
        mimeType,
        folder: data.folder?.trim() || "general",
        alt: data.alt?.trim() || null,
        size: 0,
      })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "MEDIA_CREATE",
      entityType: "media",
      entityId: row.id,
      after: { url, originalName: filename },
    });
    revalidatePath("/admin/media");
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçerli bir medya URL’si girin.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Medya eklenemedi.");
  }
}
