/**
 * Apply customers.discount_percent on Supabase / Postgres.
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
    "20260408120000_customer_discount_percent.sql",
  );
  const body = fs.readFileSync(sqlPath, "utf8");
  const sql = postgres(url, { max: 1, prepare: false, ssl: sslOption(url) });

  try {
    console.log("[supabase] applying customer discount_percent…");
    await sql.unsafe(body);

    const col = await sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'customers'
        AND column_name = 'discount_percent'
      LIMIT 1
    `;
    if (!col[0]) {
      throw new Error("discount_percent column missing after migrate");
    }
    console.log(
      "[supabase] customers.discount_percent:",
      `${col[0].data_type} default=${col[0].column_default} nullable=${col[0].is_nullable}`,
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
