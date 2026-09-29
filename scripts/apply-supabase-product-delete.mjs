/**
 * Apply product-delete FK + PRODUCT_* permissions on Supabase / Postgres.
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
    "20260329193000_product_delete_support.sql",
  );
  const body = fs.readFileSync(sqlPath, "utf8");
  const sql = postgres(url, { max: 1, prepare: false, ssl: sslOption(url) });

  try {
    console.log("[supabase] applying product-delete support…");
    await sql.unsafe(body);

    const fk = await sql`
      SELECT confdeltype
      FROM pg_constraint
      WHERE conname = 'homepage_section_items_product_id_products_id_fk'
      LIMIT 1
    `;
    const delType = fk[0]?.confdeltype;
    // a = no action, r = restrict, c = cascade, n = set null, d = set default
    console.log(
      "[supabase] homepage FK on delete:",
      delType === "n" ? "SET NULL (ok)" : `code=${delType ?? "missing"}`,
    );

    const perms = await sql`
      SELECT code FROM permissions
      WHERE code IN ('PRODUCT_CREATE','PRODUCT_EDIT','PRODUCT_DELETE','PRODUCT_VIEW')
      ORDER BY code
    `;
    console.log(
      "[supabase] product permissions:",
      perms.map((p) => p.code).join(", ") || "(none)",
    );

    const links = await sql`
      SELECT r.code AS role, count(*)::int AS n
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code IN ('PRODUCT_CREATE','PRODUCT_EDIT','PRODUCT_DELETE','PRODUCT_VIEW')
        AND r.code IN ('SUPER_ADMIN','ADMIN','PRODUCT_MANAGER')
      GROUP BY r.code
      ORDER BY r.code
    `;
    console.log(
      "[supabase] role links:",
      links.map((r) => `${r.role}=${r.n}`).join(", ") || "(none)",
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
