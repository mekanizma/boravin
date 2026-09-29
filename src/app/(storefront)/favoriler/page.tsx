import { getTranslations } from "next-intl/server";
import { FavoritesClient } from "@/components/storefront/favorites-client";

export async function generateMetadata() {
  const t = await getTranslations("Favorites");
  return { title: t("metadataTitle") };
}

export default function FavoritesPage() {
  return <FavoritesClient />;
}
