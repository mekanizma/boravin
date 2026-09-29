/**
 * Mark migrations as applied when the DB schema already exists but
 * __drizzle_migrations was never populated (common on Supabase bootstrap).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import postgres from "postgres";
import crypto from "node:crypto";

config({ path: ".env.local" });
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const journalPath = path.join(
  root,
  "drizzle",
  "migrations",
  "meta",
  "_journal.json",
);
const migrationsDir = path.join(root, "drizzle", "migrations");

function needsSsl(url) {
  return (
    url.includes("supabase.co") ||
    url.includes("pooler.supabase.com") ||
    (process.env.DATABASE_SSL ?? "").toLowerCase() === "require"
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

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.startsWith("pglite:")) {
    throw new Error("DATABASE_URL (postgres) is required");
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const entries = journal.entries;

  const sql = postgres(url, { max: 1, prepare: false, ssl: sslOption(url) });

  try {
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS drizzle;`);
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    const existing = await sql`SELECT hash FROM drizzle."__drizzle_migrations"`;
    const existingHashes = new Set(existing.map((r) => r.hash));

    let inserted = 0;
    for (const entry of entries) {
      const tag = entry.tag;
      const filePath = path.join(migrationsDir, `${tag}.sql`);
      if (!fs.existsSync(filePath)) continue;
      const hash = hashFile(filePath);
      if (existingHashes.has(hash)) continue;
      await sql`
        INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
        VALUES (${hash}, ${entry.when})
      `;
      inserted += 1;
      console.log("[stamp] recorded", tag);
    }

    console.log(`[stamp] complete (+${inserted} rows)`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[stamp] failed", err instanceof Error ? err.message : err);
  process.exit(1);
});
