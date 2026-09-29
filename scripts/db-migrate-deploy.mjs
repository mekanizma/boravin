/**
 * Production / Render pre-deploy migration (plain ESM — no tsx required).
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

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
    Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID) ||
    process.env.NODE_ENV === "production"
  );
}

function sslOption(url) {
  if (!needsSsl(url)) return undefined;
  const onRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID);
  if (
    onRender ||
    url.includes("render.com") ||
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "0" ||
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false"
  ) {
    return { rejectUnauthorized: false };
  }
  return "require";
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
  console.log(`[migrate] ssl=${needsSsl(url) ? "on" : "off"}`);

  const sql = postgres(url, {
    max: 1,
    prepare: false,
    ssl: sslOption(url),
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
