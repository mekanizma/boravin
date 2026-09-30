import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { cmsPagesForDatabase } from "../src/lib/storefront/cms-pages";

async function syncCmsPages() {
  const { closeDb, db } = await import("../src/lib/db");
  const { pages } = await import("../src/lib/db/schema");

  for (const page of cmsPagesForDatabase()) {
    await db
      .insert(pages)
      .values({
        title: page.title,
        slug: page.slug,
        content: page.content,
        status: "published",
        publishedAt: new Date(),
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
      })
      .onConflictDoUpdate({
        target: pages.slug,
        set: {
          title: page.title,
          content: page.content,
          status: "published",
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          updatedAt: new Date(),
        },
      });
    console.log(`updated ${page.slug}`);
  }

  await closeDb();
}

syncCmsPages().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
