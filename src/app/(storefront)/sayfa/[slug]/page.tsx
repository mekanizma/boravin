import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContactDetails } from "@/components/storefront/contact-details";
import { getCmsPage } from "@/lib/storefront/cms-pages";

function CmsArticle({ title, html }: { title: string; html: string }) {
  return (
    <article className="container-bv py-6 sm:py-10">
      <div className="mx-auto max-w-3xl border border-[#e3e8ec] bg-white px-4 py-6 sm:px-8 sm:py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[#111] sm:text-4xl">
          {title}
        </h1>
        <div className="cms-body mt-5" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </article>
  );
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
  const locale = await getLocale();
  const cms = getCmsPage(slug, locale);
  if (cms) {
    return { title: cms.seoTitle, description: cms.seoDescription };
  }
  const tCms = await getTranslations("Cms");
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

  const locale = await getLocale();
  const cms = getCmsPage(slug, locale);
  if (cms) {
    return <CmsArticle title={cms.title} html={cms.html} />;
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

  return <CmsArticle title={page.title} html={page.content ?? ""} />;
}
