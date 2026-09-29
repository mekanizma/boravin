/**
 * Deletes ALL mock/seed storefront data.
 * Markers: tags include "mock", sku BV-MOCK-*, order BVSEED*,
 * emails *@example.com, homepage sections, seed campaigns/coupons/blog.
 *
 * Usage: npm run db:clear-mock
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { and, eq, like } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import {
  announcements,
  blogPosts,
  campaignTargets,
  campaigns,
  coupons,
  customers,
  homepageSectionItems,
  homepageSections,
  orderItems,
  orderStatusHistory,
  orders,
  productAttributeValues,
  productImages,
  productVariants,
  products,
} from "../src/lib/db/schema";

async function clearMock() {
  console.log("Clearing MOCK data…");

  const seedOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(like(orders.orderNumber, "BVSEED%"));

  for (const order of seedOrders) {
    await db
      .delete(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, order.id));
    await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
    await db.delete(orders).where(eq(orders.id, order.id));
  }
  console.log(`  orders: ${seedOrders.length}`);

  const mockCustomers = await db
    .select({ id: customers.id })
    .from(customers)
    .where(like(customers.email, "%@example.com"));
  for (const c of mockCustomers) {
    await db.delete(customers).where(eq(customers.id, c.id));
  }
  console.log(`  customers: ${mockCustomers.length}`);

  const allProducts = await db
    .select({
      id: products.id,
      sku: products.sku,
      tags: products.tags,
      name: products.name,
      slug: products.slug,
    })
    .from(products);

  const toDelete = allProducts.filter((p) => {
    const tags = (p.tags ?? []) as string[];
    return (
      p.sku.startsWith("BV-MOCK-") ||
      tags.includes("mock") ||
      p.slug.endsWith("-mock") ||
      p.name.startsWith("Boravin Demo")
    );
  });

  for (const p of toDelete) {
    await db
      .delete(productAttributeValues)
      .where(eq(productAttributeValues.productId, p.id));
    await db.delete(productImages).where(eq(productImages.productId, p.id));
    await db.delete(productVariants).where(eq(productVariants.productId, p.id));
    await db
      .delete(homepageSectionItems)
      .where(eq(homepageSectionItems.productId, p.id));
    await db
      .delete(campaignTargets)
      .where(
        and(
          eq(campaignTargets.targetType, "product"),
          eq(campaignTargets.targetId, p.id),
        ),
      );
    await db.delete(products).where(eq(products.id, p.id));
  }
  console.log(`  products: ${toDelete.length}`);

  await db.delete(homepageSectionItems);
  await db.delete(homepageSections);
  console.log("  homepage sections: cleared");

  await db.delete(campaignTargets);
  await db.delete(campaigns);
  await db.delete(coupons);
  await db.delete(announcements);
  await db.delete(blogPosts);
  console.log("  campaigns, coupons, announcements, blog: cleared");

  console.log("Mock data cleared.");
  await closeDb();
  process.exit(0);
}

clearMock().catch(async (err) => {
  console.error(err);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
