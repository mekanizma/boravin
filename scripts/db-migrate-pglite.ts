import { config } from "dotenv";
config({ path: ".env.local" });
config();
import fs from "fs";
import path from "path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

async function main() {
  process.env.DATABASE_PROVIDER = process.env.DATABASE_PROVIDER || "pglite";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || "pglite:./data/boravin";

  const dataDirRaw =
    (process.env.DATABASE_URL ?? "pglite:./data/boravin").replace(
      /^pglite:|^file:/,
      "",
    ) || "./data/boravin";
  const dataDir = path.isAbsolute(dataDirRaw)
    ? path.normalize(dataDirRaw)
    : path.resolve(process.cwd(), dataDirRaw);

  fs.mkdirSync(dataDir, { recursive: true });

  console.log(`Migrating PGlite database at ${dataDir}…`);
  const client = new PGlite(dataDir);
  const db = drizzle(client);
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle/migrations"),
  });
  await client.close();
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
