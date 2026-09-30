"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { homepageSectionItems, homepageSections, media } from "@/lib/db/schema";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";
import { storeUploadedImage } from "@/lib/barcode/import-images";
import {
  translateHeroCopyToEn,
  type HeroCopyFields,
} from "@/lib/ai/services/hero-translate";

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  buttonLabel: string;
  eyebrowEn: string;
  titleEn: string;
  bodyEn: string;
  buttonLabelEn: string;
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
    en: {
      eyebrow: "Ready-built systems",
      title: "Curated systems, clear prices",
      body: "Pre-built PCs for gaming and office. Specs listed openly, stock in store.",
      buttonLabel: "Start shopping",
    },
  },
  {
    eyebrow: "Notebook",
    title: "Oyuncu ve iş laptopu aynı rafta",
    body: "ASUS, Apple ve günlük kullanım için seçilmiş dizüstüler.",
    imageUrl:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1600&h=900&q=80",
    linkUrl: "/kategori/bilgisayar",
    buttonLabel: "Alışverişe başla",
    en: {
      eyebrow: "Notebooks",
      title: "Gaming and work laptops on one shelf",
      body: "Curated laptops for ASUS, Apple, and everyday use.",
      buttonLabel: "Start shopping",
    },
  },
  {
    eyebrow: "Kampanya",
    title: "Bu haftanın teknoloji vitrini",
    body: "Seçili ürünlerde indirimli fiyat. Stok bitince liste kapanır.",
    imageUrl:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&h=900&q=80",
    linkUrl: "/kampanya/yaz-teknoloji",
    buttonLabel: "Alışverişe başla",
    en: {
      eyebrow: "Campaign",
      title: "This week’s tech showcase",
      body: "Discounted prices on selected items. List closes when stock runs out.",
      buttonLabel: "Start shopping",
    },
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

function metaString(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  return typeof value === "string" ? value.trim() : "";
}

function readEnFromMeta(meta: Record<string, unknown>): HeroCopyFields {
  return {
    eyebrow: metaString(meta, "eyebrowEn"),
    title: metaString(meta, "titleEn"),
    body: metaString(meta, "bodyEn"),
    buttonLabel: metaString(meta, "buttonLabelEn"),
  };
}

function hasEnCopy(en: HeroCopyFields) {
  return Boolean(en.eyebrow || en.title || en.body || en.buttonLabel);
}

function heroMetaFromCopy(tr: HeroCopyFields, en: HeroCopyFields) {
  return {
    eyebrow: tr.eyebrow,
    eyebrowEn: en.eyebrow,
    titleEn: en.title,
    bodyEn: en.body,
    buttonLabelEn: en.buttonLabel,
  };
}

function mapItem(row: typeof homepageSectionItems.$inferSelect): HeroSlide {
  const meta = (row.meta ?? {}) as Record<string, unknown>;
  const en = readEnFromMeta(meta);
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
    eyebrowEn: en.eyebrow,
    titleEn: en.title,
    bodyEn: en.body,
    buttonLabelEn: en.buttonLabel,
    sortOrder: row.sortOrder,
  };
}

async function buildLocalizedMeta(
  tr: HeroCopyFields,
  previousMeta?: Record<string, unknown> | null,
  previousTr?: HeroCopyFields | null,
) {
  const prevEn = previousMeta ? readEnFromMeta(previousMeta) : null;
  const unchanged =
    previousTr &&
    previousTr.eyebrow === tr.eyebrow &&
    previousTr.title === tr.title &&
    previousTr.body === tr.body &&
    previousTr.buttonLabel === tr.buttonLabel;

  if (unchanged && prevEn && hasEnCopy(prevEn)) {
    return heroMetaFromCopy(tr, prevEn);
  }

  if (!tr.eyebrow && !tr.title && !tr.body && !tr.buttonLabel) {
    return heroMetaFromCopy(tr, {
      eyebrow: "",
      title: "",
      body: "",
      buttonLabel: "",
    });
  }

  const en = await translateHeroCopyToEn(tr);
  return heroMetaFromCopy(tr, en);
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
        meta: heroMetaFromCopy(
          {
            eyebrow: slide.eyebrow,
            title: slide.title,
            body: slide.body,
            buttonLabel: slide.buttonLabel,
          },
          slide.en,
        ),
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
      /\/storage\/v1\/object\/public\//i.test(value) ||
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
    const tr: HeroCopyFields = {
      eyebrow: data.eyebrow?.trim() || "",
      title: data.title?.trim() || "",
      body: data.body?.trim() || "",
      buttonLabel: data.buttonLabel?.trim() || "",
    };

    if (data.id) {
      const before = await db.query.homepageSectionItems.findFirst({
        where: eq(homepageSectionItems.id, data.id),
      });
      if (!before || before.sectionId !== section.id) {
        return fail("Slayt bulunamadı.");
      }

      const beforeMeta = (before.meta ?? {}) as Record<string, unknown>;
      const meta = await buildLocalizedMeta(
        tr,
        beforeMeta,
        {
          eyebrow: metaString(beforeMeta, "eyebrow"),
          title: before.title?.trim() || "",
          body: before.subtitle?.trim() || "",
          buttonLabel: before.buttonLabel?.trim() || "",
        },
      );

      await db
        .update(homepageSectionItems)
        .set({
          title: tr.title || null,
          subtitle: tr.body || null,
          imageUrl: data.imageUrl.trim(),
          linkUrl: data.linkUrl?.trim() || null,
          buttonLabel: tr.buttonLabel || null,
          meta,
        })
        .where(eq(homepageSectionItems.id, data.id));

      await writeAuditLog({
        userId: session.user.id,
        action: "HOMEPAGE_HERO_UPDATE",
        entityType: "homepage_section_item",
        entityId: data.id,
        before,
        after: { ...data, meta },
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

    const meta = await buildLocalizedMeta(tr);

    const [created] = await db
      .insert(homepageSectionItems)
      .values({
        sectionId: section.id,
        title: tr.title || null,
        subtitle: tr.body || null,
        imageUrl: data.imageUrl.trim(),
        linkUrl: data.linkUrl?.trim() || null,
        buttonLabel: tr.buttonLabel || null,
        sortOrder: nextSort,
        meta,
      })
      .returning();

    await writeAuditLog({
      userId: session.user.id,
      action: "HOMEPAGE_HERO_CREATE",
      entityType: "homepage_section_item",
      entityId: created.id,
      after: { ...data, meta },
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

/** Replace empty or legacy single Flagship seed with the current 3 slides.
 * Also backfills missing English translations for existing slides.
 */
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

  if (mapped.length === 0 || isLegacy) {
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
        meta: heroMetaFromCopy(
          {
            eyebrow: slide.eyebrow,
            title: slide.title,
            body: slide.body,
            buttonLabel: slide.buttonLabel,
          },
          slide.en,
        ),
      });
    }

    revalidateHero();
    return listHeroSlidesForAdmin();
  }

  let changed = false;
  for (const item of items) {
    const slide = mapItem(item);
    const hasTr = Boolean(slide.eyebrow || slide.title || slide.body || slide.buttonLabel);
    if (!hasTr || hasEnCopy({
      eyebrow: slide.eyebrowEn,
      title: slide.titleEn,
      body: slide.bodyEn,
      buttonLabel: slide.buttonLabelEn,
    })) {
      continue;
    }

    const meta = await buildLocalizedMeta({
      eyebrow: slide.eyebrow,
      title: slide.title,
      body: slide.body,
      buttonLabel: slide.buttonLabel,
    });
    await db
      .update(homepageSectionItems)
      .set({ meta })
      .where(eq(homepageSectionItems.id, item.id));
    changed = true;
  }

  if (changed) revalidateHero();
  return listHeroSlidesForAdmin();
}
