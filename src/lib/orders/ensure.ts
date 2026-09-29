import { sql } from "drizzle-orm";
import { db, isPglite } from "@/lib/db";

let ensured = false;

/** Ensures `accepted` exists on order_status enum (PGlite / local bootstrap). */
export async function ensureOrderStatusEnum() {
  if (ensured) return;
  if (!isPglite()) {
    ensured = true;
    return;
  }
  try {
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'accepted';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN undefined_object THEN NULL;
      END $$
    `);
  } catch {
    try {
      await db.execute(sql`ALTER TYPE order_status ADD VALUE 'accepted'`);
    } catch {
      // Already present or DB not ready — ignore.
    }
  }
  ensured = true;
}
