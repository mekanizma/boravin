import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { loadPublishedCampaigns } from "@/lib/storefront/campaigns";
import { Button } from "@/components/ui/button";

export async function generateMetadata() {
  const t = await getTranslations("Cms");
  return { title: t("campaignsListTitle") };
}

export default async function CampaignsPage() {
  const t = await getTranslations("Cms");
  const rows = await loadPublishedCampaigns(24);

  if (!rows.length) {
    return (
      <div className="container-bv py-16 text-center">
        <h1 className="font-display text-3xl font-bold">
          {t("campaignsListTitle")}
        </h1>
        <p className="mt-2 text-[var(--bv-muted)]">{t("campaignsEmpty")}</p>
        <Link href="/urunler" className="mt-6 inline-block">
          <Button variant="accent">{t("goToProducts")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-bv py-8 sm:py-12">
      <p className="text-xs font-medium tracking-[0.18em] text-[var(--bv-copper)] uppercase">
        {t("campaignEyebrow")}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {t("campaignsListTitle")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--bv-muted)] sm:text-base">
        {t("campaignsListSubtitle")}
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((campaign) => (
          <li key={campaign.id}>
            <Link
              href={`/kampanya/${campaign.slug}`}
              className="flex h-full flex-col rounded-[1.1rem] border border-[var(--bv-border)] bg-white p-5 transition-colors hover:border-[var(--bv-sale)]"
            >
              <h2 className="text-lg font-bold tracking-tight text-[#121417]">
                {campaign.name}
              </h2>
              {campaign.shortDescription ? (
                <p className="mt-2 flex-1 text-sm text-[#666]">
                  {campaign.shortDescription}
                </p>
              ) : (
                <p className="mt-2 flex-1 text-sm text-[#666]">
                  {t("campaignDefaultBody")}
                </p>
              )}
              <span className="mt-4 text-sm font-semibold text-[var(--bv-sale)]">
                {campaign.cta?.trim() || t("defaultCta")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
