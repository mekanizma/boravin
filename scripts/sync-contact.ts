import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { eq } from "drizzle-orm";
import {
  siteContact,
  siteContactAddress,
  siteContactPageHtml,
  siteContactSettingsValue,
} from "../src/lib/storefront/site-contact";

async function syncContact() {
  const { closeDb, db } = await import("../src/lib/db");
  const { pages, settings } = await import("../src/lib/db/schema");
  const siteValue = {
    name: "BORAVIN",
    tagline: siteContact.tagline,
    companyName: siteContact.companyName,
    phone: siteContact.phones[0]?.display ?? "",
    email: siteContact.email,
    address: siteContactAddress,
    currency: "TRY",
  };
  const contactValue = siteContactSettingsValue();

  await db
    .insert(settings)
    .values({ key: "site", value: siteValue })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: siteValue, updatedAt: new Date() },
    });
  await db
    .insert(settings)
    .values({ key: "contact", value: contactValue })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: contactValue, updatedAt: new Date() },
    });

  const content = siteContactPageHtml();
  await db
    .insert(pages)
    .values({
      title: "İletişim",
      slug: "iletisim",
      content,
      status: "published",
      publishedAt: new Date(),
      seoTitle: "İletişim | Boravin",
      seoDescription: `${siteContact.companyName}, ${siteContactAddress}`,
    })
    .onConflictDoUpdate({
      target: pages.slug,
      set: {
        title: "İletişim",
        content,
        status: "published",
        seoTitle: "İletişim | Boravin",
        seoDescription: `${siteContact.companyName}, ${siteContactAddress}`,
        updatedAt: new Date(),
      },
    });

  const saved = await db.query.settings.findFirst({
    where: eq(settings.key, "contact"),
  });
  console.log("Contact settings synced.", saved?.key ?? "missing");
  await closeDb();
}

syncContact().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
