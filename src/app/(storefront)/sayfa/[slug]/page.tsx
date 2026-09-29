import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContactDetails } from "@/components/storefront/contact-details";

const CMS_PAGE_SLUGS = [
  "hakkimizda",
  "kvkk",
  "gizlilik",
  "kullanim-sartlari",
  "iade",
  "kargo",
  "sss",
] as const;

type CmsPageSlug = (typeof CMS_PAGE_SLUGS)[number];

function isCmsPageSlug(slug: string): slug is CmsPageSlug {
  return (CMS_PAGE_SLUGS as readonly string[]).includes(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "iletisim") {
    const t = await getTranslations("Contact");
    const tc = await getTranslations("SiteContact");
    return {
      title: t("metadataTitle"),
      description: t("metadataDescription", {
        company: tc("companyName"),
        address: `${tc("addressLine1")}, ${tc("addressLine2")}`,
      }),
    };
  }
  const tCms = await getTranslations("Cms");
  const locale = await getLocale();
  if (locale === "en" && isCmsPageSlug(slug)) {
    return { title: tCms(`pages.${slug}.title`) };
  }
  try {
    const page = await db.query.pages.findFirst({
      where: eq(pages.slug, slug),
    });
    if (!page) return { title: tCms("pageFallbackTitle") };
    return {
      title: page.seoTitle ?? page.title,
      description: page.seoDescription ?? undefined,
    };
  } catch {
    return { title: tCms("pageFallbackTitle") };
  }
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "iletisim") {
    return <ContactDetails />;
  }
  let page = null;
  try {
    page = await db.query.pages.findFirst({
      where: eq(pages.slug, slug),
    });
  } catch {
    page = null;
  }
  if (!page || page.status !== "published") notFound();

  const locale = await getLocale();
  const tCms = await getTranslations("Cms");
  const useLocalized =
    locale === "en" &&
    isCmsPageSlug(slug) &&
    // Only override the seed placeholder body, not custom admin HTML.
    (page.content ?? "").includes("admin panelinden düzenlenebilir");

  const title = useLocalized ? tCms(`pages.${slug}.title`) : page.title;
  const html = useLocalized
    ? `<p>${tCms(`pages.${slug}.body`)}</p>`
    : (page.content ?? "");

  return (
    <article className="container-bv prose prose-neutral max-w-3xl py-12">
      <h1 className="font-display text-4xl font-bold">{title}</h1>
      <div
        className="mt-6 text-[var(--bv-slate)]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
