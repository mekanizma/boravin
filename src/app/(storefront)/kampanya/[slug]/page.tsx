import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = await getTranslations("Cms");
  const { slug } = await params;
  let campaign = null;
  try {
    campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.slug, slug),
    });
  } catch {
    campaign = null;
  }
  if (!campaign) {
    return (
      <div className="container-bv py-16 text-center">
        <h1 className="font-display text-3xl font-bold">{t("campaignNotFoundTitle")}</h1>
        <p className="mt-2 text-[var(--bv-muted)]">
          {t("campaignNotFoundBody")}
        </p>
        <Link href="/urunler" className="mt-6 inline-block">
          <Button variant="accent">{t("goToProducts")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-bv py-12 sm:py-16">
      <p className="text-xs font-medium tracking-[0.18em] text-[var(--bv-copper)] uppercase">
        {t("campaignEyebrow")}
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
        {campaign.name}
      </h1>
      {campaign.shortDescription ? (
        <p className="mt-4 max-w-2xl text-lg text-[var(--bv-slate)]">
          {campaign.shortDescription}
        </p>
      ) : null}
      {campaign.description ? (
        <p className="mt-6 max-w-3xl whitespace-pre-wrap text-[var(--bv-slate)]">
          {campaign.description}
        </p>
      ) : null}
      <Link href="/urunler" className="mt-8 inline-block">
        <Button variant="accent">{campaign.cta ?? t("defaultCta")}</Button>
      </Link>
    </div>
  );
}
