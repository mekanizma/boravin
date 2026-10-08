import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

let ready: Promise<void> | null = null;

export async function ensureAccountColumns() {
  if (!ready) {
    ready = (async () => {
      await db.execute(
        sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_type varchar(32) DEFAULT 'individual' NOT NULL`,
      );
      await db.execute(
        sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name varchar(200)`,
      );
      await db.execute(
        sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_title varchar(200)`,
      );
      await db.execute(
        sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_office varchar(120)`,
      );
      await db.execute(
        sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number varchar(32)`,
      );
      await db.execute(
        sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS discount_percent numeric(5, 2) DEFAULT '0' NOT NULL`,
      );
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  await ready;
}
