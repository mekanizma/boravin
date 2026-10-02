import { ensureHeroSlidesReady } from "@/features/homepage/actions";
import { HeroSlidesManager } from "@/components/admin/hero-slides-manager";

export default async function HomepageBuilderPage() {
  // Seed missing slides only — do not run AI translation on every page load.
  const slides = await ensureHeroSlidesReady({ translateMissingEn: false });
  return <HeroSlidesManager slides={slides} />;
}
