import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";

export type StorefrontCampaign = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  cta: string | null;
  type: string;
  value: string | null;
};

function isLive(now: Date) {
  return and(
    eq(campaigns.status, "published"),
    or(isNull(campaigns.startsAt), lte(campaigns.startsAt, now)),
    or(isNull(campaigns.endsAt), gt(campaigns.endsAt, now)),
  );
}

async function loadPublishedCampaignsUncached(
  limit: number,
): Promise<StorefrontCampaign[]> {
  try {
    const now = new Date();
    return await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        slug: campaigns.slug,
        shortDescription: campaigns.shortDescription,
        description: campaigns.description,
        cta: campaigns.cta,
        type: campaigns.type,
        value: campaigns.value,
      })
      .from(campaigns)
      .where(isLive(now))
      .orderBy(desc(campaigns.updatedAt), desc(campaigns.priority))
      .limit(limit);
  } catch (error) {
    console.error("[campaigns] load failed", error);
    return [];
  }
}

const loadPublishedCampaignsCached = unstable_cache(
  async (limit: number) => loadPublishedCampaignsUncached(limit),
  ["storefront-campaigns-v1"],
  { revalidate: 60, tags: ["campaigns", "homepage"] },
);

export async function loadPublishedCampaigns(
  limit = 12,
): Promise<StorefrontCampaign[]> {
  return loadPublishedCampaignsCached(limit);
}

export async function getPublishedCampaignBySlug(slug: string) {
  try {
    const now = new Date();
    const [row] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.slug, slug), isLive(now)))
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error("[campaigns] slug load failed", error);
    return null;
  }
}
