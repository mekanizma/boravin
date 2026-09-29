import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

try {
  const products = await sql`select count(*)::int as n from products`;
  const users = await sql`select email from users limit 5`;
  console.log("OK products=", products[0].n);
  console.log("OK users=", users.map((u) => u.email).join(", "));
} catch (error) {
  console.error("FAIL", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 3 });
}
