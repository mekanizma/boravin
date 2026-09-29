/**
 * Production / Render pre-deploy migration (plain ESM — no tsx required).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function needsSsl(url) {
  const flag = (process.env.DATABASE_SSL ?? "").toLowerCase();
  if (flag === "0" || flag === "false" || flag === "disable") return false;
  if (flag === "1" || flag === "true" || flag === "require") return true;
  return (
    url.includes("sslmode=require") ||
    url.includes("render.com") ||
    url.includes("supabase.co") ||
    url.includes("pooler.supabase.com") ||
    process.env.NODE_ENV === "production"
  );
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required for db:migrate:deploy");
  }
  if (url.startsWith("pglite:") || url.startsWith("file:")) {
    console.log("PGlite URL detected — skipping postgres migrator.");
    return;
  }

  const folder = path.join(root, "drizzle", "migrations");
  console.log(`[migrate] folder=${folder}`);
  console.log(`[migrate] ssl=${needsSsl(url) ? "require" : "off"}`);

  const sql = postgres(url, {
    max: 1,
    prepare: false,
    ssl: needsSsl(url) ? "require" : undefined,
  });

  try {
    const db = drizzle(sql);
    await migrate(db, { migrationsFolder: folder });
    console.log("[migrate] complete");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
