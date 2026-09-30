import { and, asc, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";

export type StorefrontAnnouncement = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  cta: string | null;
  type: "top_bar" | "popup" | "homepage_banner" | "campaign_banner";
  priority: number;
};

function isLive(now: Date) {
  return and(
    eq(announcements.status, "published"),
    or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
    or(isNull(announcements.endsAt), gt(announcements.endsAt, now)),
  );
}

async function loadPublishedAnnouncementsUncached(): Promise<
  StorefrontAnnouncement[]
> {
  try {
    const now = new Date();
    return await db
      .select({
        id: announcements.id,
        title: announcements.title,
        description: announcements.description,
        imageUrl: announcements.imageUrl,
        linkUrl: announcements.linkUrl,
        cta: announcements.cta,
        type: announcements.type,
        priority: announcements.priority,
      })
      .from(announcements)
      .where(isLive(now))
      // Newest first so freshly published admin items beat old seed rows.
      .orderBy(
        desc(announcements.updatedAt),
        desc(announcements.priority),
        asc(announcements.createdAt),
      )
      .limit(40);
  } catch (error) {
    console.error("[announcements] load failed", error);
    return [];
  }
}

/** Fresh each request — announcements change often from admin. */
export async function loadPublishedAnnouncements() {
  return loadPublishedAnnouncementsUncached();
}

export async function getTopBarAnnouncement() {
  const rows = await loadPublishedAnnouncements();
  return rows.find((row) => row.type === "top_bar") ?? null;
}

export async function getPopupAnnouncement() {
  const rows = await loadPublishedAnnouncements();
  return rows.find((row) => row.type === "popup") ?? null;
}

export async function getHomepageBannerAnnouncements(limit = 2) {
  const rows = await loadPublishedAnnouncements();
  return rows
    .filter(
      (row) =>
        row.type === "homepage_banner" || row.type === "campaign_banner",
    )
    .slice(0, limit);
}

export async function nextAnnouncementPriority() {
  try {
    const [row] = await db
      .select({
        max: sql<number>`coalesce(max(${announcements.priority}), 0)::int`,
      })
      .from(announcements);
    return (row?.max ?? 0) + 1;
  } catch {
    return 1;
  }
}
