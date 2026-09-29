import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContactDetails } from "@/components/storefront/contact-details";
import { siteContact } from "@/lib/storefront/site-contact";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "iletisim") {
    return {
      title: "İletişim",
      description: `${siteContact.companyName} iletişim, adres ve telefon bilgileri. ${siteContact.addressLines.join(", ")}`,
    };
  }
  try {
    const page = await db.query.pages.findFirst({
      where: eq(pages.slug, slug),
    });
    if (!page) return { title: "Sayfa" };
    return {
      title: page.seoTitle ?? page.title,
      description: page.seoDescription ?? undefined,
    };
  } catch {
    return { title: "Sayfa" };
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

  return (
    <article className="container-bv prose prose-neutral max-w-3xl py-12">
      <h1 className="font-display text-4xl font-bold">{page.title}</h1>
      <div
        className="mt-6 text-[var(--bv-slate)]"
        dangerouslySetInnerHTML={{ __html: page.content ?? "" }}
      />
    </article>
  );
}
