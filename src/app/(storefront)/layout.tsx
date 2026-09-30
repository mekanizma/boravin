import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { AnnouncementPopup } from "@/components/storefront/announcement-popup";
import {
  getPopupAnnouncement,
  getTopBarAnnouncement,
} from "@/lib/storefront/announcements";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [topBar, popup] = await Promise.all([
    getTopBarAnnouncement(),
    getPopupAnnouncement(),
  ]);

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
