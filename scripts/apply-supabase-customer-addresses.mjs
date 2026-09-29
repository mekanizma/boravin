/**
 * Apply customer/address Supabase RLS + indexes on an existing DB
 * (when drizzle __drizzle_migrations is out of sync with reality).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function needsSsl(url) {
  const flag = (process.env.DATABASE_SSL ?? "").toLowerCase();
  if (flag === "0" || flag === "false" || flag === "disable") return false;
  if (flag === "1" || flag === "true" || flag === "require") return true;
  return (
    url.includes("sslmode=require") ||
    url.includes("supabase.co") ||
    url.includes("pooler.supabase.com") ||
    process.env.NODE_ENV === "production"
  );
}

function sslOption(url) {
  if (!needsSsl(url)) return undefined;
  if (
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "0" ||
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false"
  ) {
    return { rejectUnauthorized: false };
  }
  return "require";
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.startsWith("pglite:")) {
    throw new Error("DATABASE_URL (postgres) is required");
  }

  const sqlPath = path.join(
    root,
    "supabase",
    "migrations",
    "20260229194500_customer_addresses_rls.sql",
  );
  const body = fs.readFileSync(sqlPath, "utf8");

  const sql = postgres(url, { max: 1, prepare: false, ssl: sslOption(url) });

  try {
    const idx = await sql`
      SELECT 1 AS ok FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = 'addresses_customer_id_idx'
      LIMIT 1
    `;
    if (idx.length > 0) {
      console.log("[supabase] customer/address policies already applied (index exists)");
      return;
    }

    console.log("[supabase] applying customer/address migration…");
    await sql.unsafe(body);

    const policies = await sql`
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename IN ('customers', 'addresses')
      ORDER BY policyname
    `;
    console.log(
      "[supabase] policies:",
      policies.map((p) => p.policyname).join(", "),
    );
    console.log("[supabase] done");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[supabase] failed", err instanceof Error ? err.message : err);
  process.exit(1);
});
