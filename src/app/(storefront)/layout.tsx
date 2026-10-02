import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { AnnouncementPopup } from "@/components/storefront/announcement-popup";
import { WhatsAppFloat } from "@/components/storefront/whatsapp-float";
import { loadPublishedAnnouncements } from "@/lib/storefront/announcements";

/** Allow data caches (announcements / product cards) to stick across requests. */
export const revalidate = 60;

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // One DB round-trip for both top bar + popup (previously two identical loads).
  const announcements = await loadPublishedAnnouncements();
  const topBar = announcements.find((row) => row.type === "top_bar") ?? null;
  const popup = announcements.find((row) => row.type === "popup") ?? null;

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader
        promoBar={
          topBar
            ? { title: topBar.title, linkUrl: topBar.linkUrl }
            : null
        }
      />
      <main className="relative flex-1 bg-[#e8edf1]">{children}</main>
      <SiteFooter />
      <WhatsAppFloat />
      <AnnouncementPopup
        announcement={
          popup
            ? {
                id: popup.id,
                title: popup.title,
                description: popup.description,
                linkUrl: popup.linkUrl,
                cta: popup.cta,
              }
            : null
        }
      />
    </div>
  );
}
