import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader />
      <main className="relative flex-1 bg-[#e8edf1]">{children}</main>
      <SiteFooter />
    </div>
  );
}
