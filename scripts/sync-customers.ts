import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { closeDb } from "../src/lib/db";
import { syncCustomersFromAuth } from "../src/lib/account/sync-customers";

async function main() {
  const synced = await syncCustomersFromAuth();
  console.log("Synced customer profiles:", synced);
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
