/**
 * Tags existing seed products as mock so db:clear-mock can remove them.
 */
process.env.DATABASE_PROVIDER = process.env.DATABASE_PROVIDER || "pglite";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "pglite:./data/boravin";

import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";

async function main() {
  await db.execute(sql`
    UPDATE products
    SET tags = COALESCE(tags, '[]'::jsonb) || '["mock"]'::jsonb
    WHERE NOT (COALESCE(tags, '[]'::jsonb) @> '["mock"]'::jsonb)
  `);
  await db.execute(sql`
    UPDATE products
    SET sku = 'BV-MOCK-' || regexp_replace(sku, '^BV-?', '')
    WHERE sku LIKE 'BV-%' AND sku NOT LIKE 'BV-MOCK-%'
  `);
  console.log("Existing catalog tagged as mock.");
  await closeDb();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
