"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { homepageSectionItems, homepageSections, media } from "@/lib/db/schema";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";
import { storeUploadedImage } from "@/lib/barcode/import-images";

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  buttonLabel: string;
  sortOrder: number;
};

const DEFAULT_HERO_SLIDES = [
  {
    eyebrow: "Hazır sistemler",
    title: "Seçilmiş sistemler, net fiyat",
    body: "Gaming ve ofis için hazırlanan kasalar. Parça listesi açık, stok mağazada.",
    imageUrl:
      "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1600&h=900&q=80",
    linkUrl: "/urunler",
    buttonLabel: "Alışverişe başla",
  },
  {
    eyebrow: "Notebook",
    title: "Oyuncu ve iş laptopu aynı rafta",
    body: "ASUS, Apple ve günlük kullanım için seçilmiş dizüstüler.",
    imageUrl:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1600&h=900&q=80",
    linkUrl: "/kategori/bilgisayar",
    buttonLabel: "Alışverişe başla",
  },
  {
    eyebrow: "Kampanya",
    title: "Bu haftanın teknoloji vitrini",
    body: "Seçili ürünlerde indirimli fiyat. Stok bitince liste kapanır.",
    imageUrl:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&h=900&q=80",
    linkUrl: "/kampanya/yaz-teknoloji",
    buttonLabel: "Alışverişe başla",
  },
] as const;

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function revalidateHero() {
  revalidateTag("homepage", "max");
  revalidatePath("/");
  revalidatePath("/admin/homepage");
}

function mapItem(row: typeof homepageSectionItems.$inferSelect): HeroSlide {
  const meta = (row.meta ?? {}) as Record<string, unknown>;
  const eyebrow =
    typeof meta.eyebrow === "string" && meta.eyebrow.trim()
      ? meta.eyebrow.trim()
      : "";
  return {
    id: row.id,
    eyebrow,
    title: row.title?.trim() || "",
    body: row.subtitle?.trim() || "",
    imageUrl: row.imageUrl?.trim() || "",
    linkUrl: row.linkUrl?.trim() || "",
    buttonLabel: row.buttonLabel?.trim() || "Alışverişe başla",
    sortOrder: row.sortOrder,
  };
}

async function getOrCreateHeroSection() {
  const existing = await db.query.homepageSections.findFirst({
    where: eq(homepageSections.type, "hero"),
    orderBy: [asc(homepageSections.sortOrder)],
  });
  if (existing) return existing;

  const [created] = await db
    .insert(homepageSections)
    .values({
      type: "hero",
      title: "Hero",
      subtitle: "Anasayfa hero slider",
      sortOrder: 0,
      status: "published",
      config: {},
    })
    .returning();
  return created;
}

export async function listHeroSlides(): Promise<HeroSlide[]> {
  try {
    const section = await db.query.homepageSections.findFirst({
      where: and(
        eq(homepageSections.type, "hero"),
        eq(homepageSections.status, "published"),
      ),
      orderBy: [asc(homepageSections.sortOrder)],
    });
    if (!section) return [];

    const items = await db
      .select()
      .from(homepageSectionItems)
      .where(eq(homepageSectionItems.sectionId, section.id))
      .orderBy(asc(homepageSectionItems.sortOrder));

    return items
      .map(mapItem)
      .filter((slide) => Boolean(slide.imageUrl));
  } catch {
    return [];
  }
}

/** Admin list — includes drafts / empty image for editing. */
export async function listHeroSlidesForAdmin(): Promise<HeroSlide[]> {
  const session = await requirePermission("CONTENT_MANAGE");
  void session;
  const section = await getOrCreateHeroSection();
  const items = await db
    .select()
    .from(homepageSectionItems)
    .where(eq(homepageSectionItems.sectionId, section.id))
    .orderBy(asc(homepageSectionItems.sortOrder));
  return items.map(mapItem);
}

/** One-time / repair: seed the current 3 storefront slides if missing. */
export async function seedDefaultHeroSlides(): Promise<ActionResult> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const section = await getOrCreateHeroSection();
    const existing = await db
      .select({ id: homepageSectionItems.id })
      .from(homepageSectionItems)
      .where(eq(homepageSectionItems.sectionId, section.id));

    if (existing.length > 0) {
      return fail("Zaten slayt var. Önce mevcutları silin veya düzenleyin.");
    }

    for (const [index, slide] of DEFAULT_HERO_SLIDES.entries()) {
      await db.insert(homepageSectionItems).values({
        sectionId: section.id,
        title: slide.title,
        subtitle: slide.body,
        imageUrl: slide.imageUrl,
        linkUrl: slide.linkUrl,
        buttonLabel: slide.buttonLabel,
        sortOrder: index,
        meta: { eyebrow: slide.eyebrow },
      });
    }

    await writeAuditLog({
      userId: session.user.id,
      action: "HOMEPAGE_HERO_SEED",
      entityType: "homepage_section",
      entityId: section.id,
      after: { count: DEFAULT_HERO_SLIDES.length },
    });
    revalidateHero();
    return { ok: true, id: section.id };
  } catch (e) {
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Varsayılan slaytlar eklenemedi.");
  }
}

const imageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine(
    (value) =>
      value.startsWith("/uploads/") ||
      /^https?:\/\//i.test(value),
    "Geçersiz görsel adresi",
  );

const slideSchema = z.object({
  id: z.string().uuid().optional(),
  eyebrow: z.string().trim().max(80).optional().nullable(),
  title: z.string().trim().max(200).optional().nullable(),
  body: z.string().trim().max(500).optional().nullable(),
  imageUrl: imageUrlSchema,
  linkUrl: z.string().trim().max(500).optional().nullable(),
  buttonLabel: z.string().trim().max(80).optional().nullable(),
});

export async function uploadHeroImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return { ok: false, error: "Dosya seçilmedi." };
    }
    if (file.size > 6 * 1024 * 1024) {
      return { ok: false, error: "Görsel en fazla 6 MB olabilir." };
    }

    const url = await storeUploadedImage(file, "homepage");
    if (!url) {
      return {
        ok: false,
        error: "Geçersiz görsel. JPG, PNG, WEBP veya GIF yükleyin.",
      };
    }

    const originalName = (file.name || "hero").slice(0, 255);
    await db.insert(media).values({
      filename: originalName,
      originalName,
      url,
      mimeType: file.type || null,
      size: file.size,
      folder: "homepage",
      alt: "Hero slayt",
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "HOMEPAGE_HERO_UPLOAD",
      entityType: "media",
      after: { url, originalName, size: file.size },
    });
    revalidatePath("/admin/media");
    return { ok: true, url };
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")
    ) {
      return { ok: false, error: "Bu işlem için yetkiniz yok." };
    }
    return { ok: false, error: "Görsel yüklenemedi." };
  }
}

export async function saveHeroSlide(
  raw: z.infer<typeof slideSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const data = slideSchema.parse(raw);
    const section = await getOrCreateHeroSection();
    const meta = { eyebrow: data.eyebrow?.trim() || "" };

    if (data.id) {
      const before = await db.query.homepageSectionItems.findFirst({
        where: eq(homepageSectionItems.id, data.id),
      });
      if (!before || before.sectionId !== section.id) {
        return fail("Slayt bulunamadı.");
      }

      await db
        .update(homepageSectionItems)
        .set({
          title: data.title?.trim() || null,
          subtitle: data.body?.trim() || null,
          imageUrl: data.imageUrl.trim(),
          linkUrl: data.linkUrl?.trim() || null,
          buttonLabel: data.buttonLabel?.trim() || null,
          meta,
        })
        .where(eq(homepageSectionItems.id, data.id));

      await writeAuditLog({
        userId: session.user.id,
        action: "HOMEPAGE_HERO_UPDATE",
        entityType: "homepage_section_item",
        entityId: data.id,
        before,
        after: data,
      });
      revalidateHero();
      return { ok: true, id: data.id };
    }

    const current = await db
      .select({ sortOrder: homepageSectionItems.sortOrder })
      .from(homepageSectionItems)
      .where(eq(homepageSectionItems.sectionId, section.id));
    const nextSort =
      current.length === 0
        ? 0
        : Math.max(...current.map((row) => row.sortOrder)) + 1;

    const [created] = await db
      .insert(homepageSectionItems)
      .values({
        sectionId: section.id,
        title: data.title?.trim() || null,
        subtitle: data.body?.trim() || null,
        imageUrl: data.imageUrl.trim(),
        linkUrl: data.linkUrl?.trim() || null,
        buttonLabel: data.buttonLabel?.trim() || null,
        sortOrder: nextSort,
        meta,
      })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "HOMEPAGE_HERO_CREATE",
      entityType: "homepage_section_item",
      entityId: created.id,
      after: data,
    });
    revalidateHero();
    return { ok: true, id: created.id };
  } catch (e) {
    if (e instanceof z.ZodError) return fail("Geçersiz slayt bilgisi.");
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Slayt kaydedilemedi.");
  }
}

export async function deleteHeroSlide(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const section = await getOrCreateHeroSection();
    const before = await db.query.homepageSectionItems.findFirst({
      where: eq(homepageSectionItems.id, id),
    });
    if (!before || before.sectionId !== section.id) {
      return fail("Slayt bulunamadı.");
    }

    await db
      .delete(homepageSectionItems)
      .where(eq(homepageSectionItems.id, id));

    await writeAuditLog({
      userId: session.user.id,
      action: "HOMEPAGE_HERO_DELETE",
      entityType: "homepage_section_item",
      entityId: id,
      before,
    });
    revalidateHero();
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Slayt silinemedi.");
  }
}

export async function moveHeroSlide(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  try {
    const session = await requirePermission("CONTENT_MANAGE");
    const section = await getOrCreateHeroSection();
    const items = await db
      .select()
      .from(homepageSectionItems)
      .where(eq(homepageSectionItems.sectionId, section.id))
      .orderBy(asc(homepageSectionItems.sortOrder));

    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return fail("Slayt bulunamadı.");
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= items.length) {
      return { ok: true, id };
    }

    const a = items[index];
    const b = items[swapWith];
    await db
      .update(homepageSectionItems)
      .set({ sortOrder: b.sortOrder })
      .where(eq(homepageSectionItems.id, a.id));
    await db
      .update(homepageSectionItems)
      .set({ sortOrder: a.sortOrder })
      .where(eq(homepageSectionItems.id, b.id));

    await writeAuditLog({
      userId: session.user.id,
      action: "HOMEPAGE_HERO_REORDER",
      entityType: "homepage_section_item",
      entityId: id,
      after: { direction },
    });
    revalidateHero();
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
      return fail("Bu işlem için yetkiniz yok.");
    }
    return fail("Sıra güncellenemedi.");
  }
}

/** Replace empty or legacy single Flagship seed with the current 3 slides. */
export async function ensureHeroSlidesReady(): Promise<HeroSlide[]> {
  const session = await requirePermission("CONTENT_MANAGE");
  void session;
  const section = await getOrCreateHeroSection();
  const items = await db
    .select()
    .from(homepageSectionItems)
    .where(eq(homepageSectionItems.sectionId, section.id))
    .orderBy(asc(homepageSectionItems.sortOrder));

  const mapped = items.map(mapItem);
  const isLegacy =
    mapped.length === 1 && mapped[0]?.title === "Flagship vitrin";

  if (mapped.length > 0 && !isLegacy) return mapped;

  if (isLegacy) {
    await db
      .delete(homepageSectionItems)
      .where(eq(homepageSectionItems.sectionId, section.id));
  }

  for (const [index, slide] of DEFAULT_HERO_SLIDES.entries()) {
    await db.insert(homepageSectionItems).values({
      sectionId: section.id,
      title: slide.title,
      subtitle: slide.body,
      imageUrl: slide.imageUrl,
      linkUrl: slide.linkUrl,
      buttonLabel: slide.buttonLabel,
      sortOrder: index,
      meta: { eyebrow: slide.eyebrow },
    });
  }

  revalidateHero();
  return listHeroSlidesForAdmin();
}
