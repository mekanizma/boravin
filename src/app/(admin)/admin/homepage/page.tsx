import { ensureHeroSlidesReady } from "@/features/homepage/actions";
import { HeroSlidesManager } from "@/components/admin/hero-slides-manager";

export default async function HomepageBuilderPage() {
  const slides = await ensureHeroSlidesReady();
  return <HeroSlidesManager slides={slides} />;
}
