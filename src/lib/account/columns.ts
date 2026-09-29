import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function ensureAccountColumns() {
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
}
