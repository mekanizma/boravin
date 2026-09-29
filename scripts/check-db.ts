import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { products } from "../src/lib/db/schema";

async function main() {
  const rows = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(products);
  const sample = await db.select().from(products).limit(3);
  console.log("count", rows);
  console.log(
    "sample",
    sample.map((p) => ({ name: p.name, status: p.status, featured: p.isFeatured })),
  );
  await closeDb();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
